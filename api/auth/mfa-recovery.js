// api/auth/mfa-recovery.js — Salva hashes dos códigos de recuperação MFA (R5)
// Recebe os códigos em plaintext, salva apenas os hashes SHA-256, descarta os originais.

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const { insert, del } = require('../_lib/supabase')

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
  if (!user?.id) return res.status(401).json({ error: 'Token inválido' })

  const { codes } = req.body ?? {}
  if (!Array.isArray(codes) || codes.length !== 8) {
    return res.status(400).json({ error: 'Esperado array de 8 códigos' })
  }

  // Remove códigos anteriores e insere os novos
  try {
    await del('mfa_recovery_codes', { user_id: user.id })
    const hashes = await Promise.all(
      codes.map(async (c) => ({
        user_id: user.id,
        code_hash: await sha256(c),
      })),
    )
    await insert('mfa_recovery_codes', hashes)
  } catch (err) {
    console.error('[mfa-recovery]', err)
    return res.status(500).json({ error: 'Erro ao salvar códigos' })
  }

  return res.status(200).json({ ok: true })
}
