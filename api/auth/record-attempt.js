// api/auth/record-attempt.js — Registra tentativa de login (R3, R10)

const { insert } = require('../_lib/supabase')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, success } = req.body ?? {}

  if (typeof email !== 'string' || email.length > 254) {
    return res.status(400).json({ error: 'E-mail inválido' })
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ??
    req.socket?.remoteAddress ??
    null

  try {
    await insert('auth_attempts', {
      email: email.toLowerCase().trim(),
      success: success === true,
      ip,
    })
  } catch (err) {
    // Não falha silenciosamente em prod — loga o erro
    console.error('[record-attempt]', err)
  }

  return res.status(200).json({ ok: true })
}
