// api/auth/recovery-login.js — Login MFA usando código de recuperação (R5)
// Verifica o hash do código, marca como usado, remove o fator TOTP (força re-enroll).

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const { select, update } = require('../_lib/supabase')

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyJwt(token) {
  if (!SUPABASE_URL) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = (req.headers.authorization ?? '').replace('Bearer ', '')
  const user = await verifyJwt(token)
  if (!user?.id) return res.status(401).json({ error: 'Não autenticado' })

  const { code, factorId } = req.body ?? {}
  if (typeof code !== 'string' || !code) {
    return res.status(400).json({ error: 'Código obrigatório' })
  }

  const hash = await sha256(code.toUpperCase())

  // Busca o código no banco
  const rows = await select('mfa_recovery_codes', { user_id: user.id, code_hash: hash })
  const row = rows?.[0]

  if (!row) return res.status(400).json({ error: 'Código de recuperação inválido.' })
  if (row.used_at) return res.status(400).json({ error: 'Código já utilizado.' })

  // Marca como usado (uma única vez)
  await update('mfa_recovery_codes', { id: row.id }, { used_at: new Date().toISOString() })

  // Remove o fator MFA — usuário precisará se re-enrolar
  if (SUPABASE_URL && SERVICE_KEY && factorId) {
    await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}/factors/${factorId}`,
      {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      },
    )
  }

  return res.status(200).json({ ok: true, note: 'Re-enroll MFA required after recovery.' })
}
