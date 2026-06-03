// api/auth/signup.js — Valida os dados do cadastro server-side (R2, R11)
// NÃO cria o usuário — apenas valida. O cliente chama supabase.auth.signUp()
// depois, o que garante o envio automático do e-mail de confirmação pelo Supabase.

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]).{8,}$/

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function isLeaked(password) {
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password))
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('').toUpperCase()
    const prefix = hex.slice(0, 5)
    const suffix = hex.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return false
    const text = await res.text()
    return text.split('\n').some((line) => line.split(':')[0] === suffix)
  } catch {
    return false
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const start = Date.now()
  const { email, password, name, team } = req.body ?? {}

  const errors = []
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100)
    errors.push('Nome inválido (2–100 caracteres)')
  if (team !== null && team !== undefined && (typeof team !== 'string' || team.length > 100))
    errors.push('Equipe inválida (máximo 100 caracteres)')
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('E-mail inválido')
  if (typeof password !== 'string' || password.length < 8 || password.length > 128)
    errors.push('Senha deve ter entre 8 e 128 caracteres')
  else if (!PASSWORD_PATTERN.test(password))
    errors.push('Senha deve ter maiúscula, minúscula, número e símbolo')

  if (errors.length > 0) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res.status(400).json({ error: errors[0] })
  }

  const leaked = await isLeaked(password)
  if (leaked) {
    await sleep(Math.max(0, 250 - (Date.now() - start)))
    return res.status(400).json({ error: 'Esta senha consta em bases de dados de vazamentos. Escolha outra.' })
  }

  await sleep(Math.max(0, 250 - (Date.now() - start)))
  return res.status(200).json({ ok: true })
}
