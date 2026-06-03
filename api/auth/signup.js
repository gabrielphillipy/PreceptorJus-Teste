// api/auth/signup.js — Proxy de cadastro com validação server-side completa (R2, R8)
// Usuários são criados via service_role (admin API), nunca diretamente pela anon key.
// No Supabase Dashboard, definir rate limit de signup para 0 (bloquear anon signups).

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Política de senha: mesma regra do front (auth-utils.ts)
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]).{8,}$/

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Verifica senha no HaveIBeenPwned diretamente (sem precisar do proxy cliente)
async function isLeaked(password) {
  try {
    const buf = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(password),
    )
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    const prefix = hex.slice(0, 5)
    const suffix = hex.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return false
    const text = await res.text()
    return text.split('\n').some((line) => line.split(':')[0] === suffix)
  } catch {
    return false // fail-open
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const start = Date.now()

  const { email, password, name, team } = req.body ?? {}

  // ── Validações (R2, R11) ──────────────────────────────────────────────────
  const errors = []

  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    errors.push('Nome inválido (2–100 caracteres)')
  }
  if (team !== null && team !== undefined && (typeof team !== 'string' || team.length > 100)) {
    errors.push('Equipe inválida (máximo 100 caracteres)')
  }
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push('E-mail inválido')
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    errors.push('Senha deve ter entre 8 e 128 caracteres')
  } else if (!PASSWORD_PATTERN.test(password)) {
    errors.push('Senha deve ter maiúscula, minúscula, número e símbolo')
  }

  if (errors.length > 0) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res.status(400).json({ error: errors[0] })
  }

  // ── HIBP (R2) ────────────────────────────────────────────────────────────
  const leaked = await isLeaked(password)
  if (leaked) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res
      .status(400)
      .json({ error: 'Esta senha consta em bases de dados de vazamentos. Escolha outra.' })
  }

  // ── Criar usuário via admin API (service_role) ────────────────────────────
  // Em caso de e-mail já existente, o Supabase retorna erro — mas nós retornamos
  // a mesma resposta de sucesso (anti-enumeração R1)
  if (SUPABASE_URL && SERVICE_KEY) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: false, // exige confirmação por e-mail (R, Supabase Dashboard)
        user_metadata: {
          name: name.trim().slice(0, 100),
          team: team?.trim().slice(0, 100) ?? null,
        },
      }),
    })
    // Não inspecionamos a resposta para evitar revelar se o e-mail existe (R1)
  }

  // Delay mínimo de 250ms (R1 anti-timing)
  await sleep(Math.max(0, 250 - (Date.now() - start)))
  return res.status(200).json({ ok: true })
}
