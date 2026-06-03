import type { AuditAction } from './database.types'

// ─── Anti-enumeração: mensagens constantes para qualquer falha (R1) ──────────
export const GENERIC_AUTH_ERROR =
  'E-mail ou senha incorretos. Verifique e tente novamente.'

// Signup: mesma mensagem para e-mail novo ou já cadastrado
export const GENERIC_SIGNUP_SUCCESS =
  'Verifique seu e-mail para confirmar o cadastro.'

// Reset: sempre esta frase, independentemente da existência do e-mail
export const GENERIC_RESET_SUCCESS =
  'Se o e-mail estiver cadastrado, enviaremos um link de redefinição em breve.'

// ─── Política de senha (R2) ──────────────────────────────────────────────────
// Decisão: 8 chars + maiúscula + minúscula + dígito + símbolo.
// Justificativa: OWASP SP800-63B — combinação de complexidade + HIBP leak check
// oferece proteção equivalente a senhas de 12+ chars simples, com melhor UX.
// A mesma regra é aplicada no front (HTML minLength/pattern + Zod) e no back
// (api/auth/signup.js). O Supabase Dashboard aplica: min 8, upper, lower, number.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_PATTERN =
  // eslint-disable-next-line no-useless-escape
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]).{8,}$/
export const PASSWORD_HINT =
  'Mínimo 8 caracteres com letra maiúscula, minúscula, número e símbolo (ex: !@#$)'

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_HINT
  if (!PASSWORD_PATTERN.test(password)) return PASSWORD_HINT
  return null
}

// ─── Delay mínimo anti-timing (R1) ───────────────────────────────────────────
// Garante ≥ 250 ms de latência para qualquer resposta de auth na camada de UI,
// independente do caminho (sucesso, falha, e-mail válido/inválido).
// Nota: isso protege o feedback visual. Para proteção completa contra ataques
// diretos à API do Supabase, o api/auth/pre-login.js também aplica o delay.
export async function withMinDelay<T>(fn: () => Promise<T>, minMs = 250): Promise<T> {
  const start = Date.now()
  const result = await fn()
  const elapsed = Date.now() - start
  if (elapsed < minMs) await sleep(minMs - elapsed)
  return result
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── HaveIBeenPwned — k-anonymity (R2) ───────────────────────────────────────
// 1. SHA-1 da senha calculado no browser (Web Crypto API — nunca sai do dispositivo).
// 2. Envia apenas os primeiros 5 caracteres hex ao nosso proxy /api/auth/hibp.
// 3. O servidor busca os suffixes correspondentes na API HIBP.
// 4. Verificamos localmente se o suffix completo está na lista.
export async function checkPasswordLeak(password: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password))
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    const prefix = hex.slice(0, 5)
    const suffix = hex.slice(5)

    const res = await fetch('/api/auth/hibp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix }),
    })
    if (!res.ok) return false // fail-open: não bloqueia se HIBP estiver indisponível
    const { hashes } = (await res.json()) as { hashes: string[] }
    return hashes.some((line) => line.toUpperCase().startsWith(suffix))
  } catch {
    return false // TODO: log no Sentry; não bloquear cadastro por falha de rede
  }
}

// ─── Auditoria (R10) ──────────────────────────────────────────────────────────
export async function writeAuditEvent(payload: {
  action: AuditAction
  actorId?: string
  targetId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await fetch('/api/auth/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Falha de auditoria não deve interromper o fluxo do usuário
    // TODO: enfileirar para retry ou logar no Sentry
  }
}
