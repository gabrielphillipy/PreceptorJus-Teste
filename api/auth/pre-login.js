// api/auth/pre-login.js — Verificação de lockout + CAPTCHA antes do login (R1, R3)
// Chamado pelo cliente ANTES de tentar supabase.signInWithPassword.

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_WINDOW_MIN = 15

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Chama a função SQL check_login_lockout via Supabase RPC
async function isLockedOut(email) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_login_lockout`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_email: email,
        p_threshold: LOCKOUT_THRESHOLD,
        p_window_minutes: LOCKOUT_WINDOW_MIN,
      }),
    })
    if (!res.ok) return false
    const locked = await res.json()
    return locked === true
  } catch {
    return false // fail-open
  }
}

async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET) return true // sem secret: não verifica (dev/staging sem chave)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip ?? '',
      }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const start = Date.now()
  const { email, captchaToken } = req.body ?? {}
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ??
    req.socket?.remoteAddress ??
    null

  if (typeof email !== 'string' || email.length > 254) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res.status(400).json({ error: 'E-mail inválido' })
  }

  // ── Verificar lockout via RPC (R3) ─────────────────────────────────────────
  const locked = await isLockedOut(email.toLowerCase().trim())
  if (locked) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res.status(429).json({
      error: 'Conta temporariamente bloqueada. Aguarde 15 minutos.',
    })
  }

  // ── Verificar CAPTCHA se token fornecido (R3) ──────────────────────────────
  if (captchaToken) {
    const valid = await verifyTurnstile(captchaToken, ip)
    if (!valid) {
      await sleep(Math.max(0, 250 - (Date.now() - start)))
      return res.status(403).json({ error: 'CAPTCHA inválido', captchaRequired: true })
    }
  }

  // Delay mínimo de 250ms anti-timing (R1)
  await sleep(Math.max(0, 250 - (Date.now() - start)))
  return res.status(200).json({ allowed: true })
}
