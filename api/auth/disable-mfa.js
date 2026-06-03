// api/auth/disable-mfa.js — Remove fator TOTP via service_role (R5)
// Requer JWT válido do usuário no header Authorization.

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verifyJwt(token) {
  if (!SUPABASE_URL) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) return res.status(401).json({ error: 'Token ausente' })

  const user = await verifyJwt(token)
  if (!user?.id) return res.status(401).json({ error: 'Token inválido' })

  const { factorId } = req.body ?? {}
  if (typeof factorId !== 'string' || !factorId) {
    return res.status(400).json({ error: 'factorId obrigatório' })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(503).json({ error: 'Supabase não configurado' })
  }

  // Remove o fator usando a Admin API
  const del = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${user.id}/factors/${factorId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  )

  if (!del.ok) {
    const body = await del.text()
    console.error('[disable-mfa]', body)
    return res.status(500).json({ error: 'Erro ao remover fator MFA' })
  }

  return res.status(200).json({ ok: true })
}
