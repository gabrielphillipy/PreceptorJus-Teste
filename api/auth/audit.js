// api/auth/audit.js — Escreve evento no audit_log (R10)
// A tabela audit_log tem trigger que impede UPDATE e DELETE (imutável).

const { insert } = require('../_lib/supabase')

const ALLOWED_ACTIONS = new Set([
  'signup',
  'login_success',
  'login_failure',
  'logout',
  'password_reset_requested',
  'password_reset_completed',
  'role_changed',
  'email_changed',
  'mfa_enrolled',
  'mfa_disabled',
  'login_locked',
])

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, actorId, targetId, metadata } = req.body ?? {}

  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Ação de auditoria inválida' })
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ??
    req.socket?.remoteAddress ??
    null
  const userAgent = req.headers['user-agent'] ?? null

  try {
    await insert('audit_log', {
      action,
      actor_id: actorId ?? null,
      target_id: targetId ?? null,
      ip,
      user_agent: userAgent?.slice(0, 512) ?? null,
      metadata: metadata ?? null,
    })
  } catch (err) {
    console.error('[audit]', err)
    // Auditoria não pode falhar silenciosamente — log é sempre registrado
    // TODO: integrar Sentry aqui
  }

  return res.status(200).json({ ok: true })
}
