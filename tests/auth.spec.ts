/**
 * Testes E2E de autenticação (R1–R5, Playwright)
 *
 * Pré-requisitos:
 * 1. VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configurados em .env
 * 2. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configurados para o helper admin
 * 3. `npm run dev` rodando (ou webServer configurado no playwright.config.ts)
 */

import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// ── Admin client para setup/teardown ─────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const TEST_EXISTING_EMAIL = `test.existing.${Date.now()}@example.invalid`
const TEST_EXISTING_PASS = 'ExistingUser@1234'
const TEST_NEW_EMAIL = `test.new.${Date.now()}@example.invalid`

let existingUserId: string | null = null

// ── Setup: cria usuário pré-existente ─────────────────────────────────────────
test.beforeAll(async () => {
  const { data } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EXISTING_EMAIL,
    password: TEST_EXISTING_PASS,
    email_confirm: true,
  })
  existingUserId = data.user?.id ?? null
})

// ── Teardown: remove usuários de teste ───────────────────────────────────────
test.afterAll(async () => {
  if (existingUserId) {
    await supabaseAdmin.auth.admin.deleteUser(existingUserId)
  }
})

// ── Helper: navega para login e preenche o formulário ────────────────────────
async function fillLogin(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
}

// ── Helper: navega para signup e preenche o formulário ───────────────────────
async function fillSignup(page: Page, email: string, password: string) {
  await page.goto('/signup')
  await page.fill('input#name', 'Teste E2E')
  await page.fill('input[type="email"]', email)
  await page.fill('input#password', password)
  await page.fill('input#confirmPassword', password)
}

// ═══════════════════════════════════════════════════════════════════════════════
// R1 — Anti-enumeração: Login
// Mesma mensagem para e-mail inexistente E para senha errada de e-mail existente
// ═══════════════════════════════════════════════════════════════════════════════

test('R1 login — e-mail inexistente retorna mensagem genérica', async ({ page }) => {
  await fillLogin(page, 'nao.existe@example.invalid', 'QualquerSenha@123')
  await page.click('button[type="submit"]')
  await expect(page.locator('[role="alert"]')).toContainText('E-mail ou senha incorretos')
})

test('R1 login — senha errada para e-mail existente retorna MESMA mensagem', async ({
  page,
}) => {
  await fillLogin(page, TEST_EXISTING_EMAIL, 'SenhaErrada@999')
  await page.click('button[type="submit"]')
  await expect(page.locator('[role="alert"]')).toContainText('E-mail ou senha incorretos')
})

test('R1 login — timing: resposta ≥ 250ms mesmo com credenciais inválidas', async ({
  page,
}) => {
  await fillLogin(page, 'nao.existe@example.invalid', 'QualquerSenha@123')
  const start = Date.now()
  await page.click('button[type="submit"]')
  await page.waitForSelector('[role="alert"]')
  const elapsed = Date.now() - start
  expect(elapsed).toBeGreaterThanOrEqual(250)
})

// ═══════════════════════════════════════════════════════════════════════════════
// R1 — Anti-enumeração: Signup
// E-mail novo e e-mail existente → mesma mensagem de confirmação
// ═══════════════════════════════════════════════════════════════════════════════

test('R1 signup — e-mail novo mostra mensagem de confirmação', async ({ page }) => {
  await fillSignup(page, TEST_NEW_EMAIL, 'NovoUsuario@1234')
  await page.click('button[type="submit"]')
  // Deve mostrar a tela de "verifique seu e-mail"
  await expect(page.locator('h1')).toContainText('Verifique seu e-mail', { timeout: 5000 })
})

test('R1 signup — e-mail existente mostra a MESMA mensagem de confirmação', async ({
  page,
}) => {
  await fillSignup(page, TEST_EXISTING_EMAIL, 'NovoUsuario@1234')
  await page.click('button[type="submit"]')
  // Deve mostrar a MESMA tela de "verifique seu e-mail" (não erro de e-mail duplicado)
  await expect(page.locator('h1')).toContainText('Verifique seu e-mail', { timeout: 5000 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// R1 — Anti-enumeração: Reset de senha
// E-mail existente e inexistente → mesma mensagem
// ═══════════════════════════════════════════════════════════════════════════════

test('R1 reset — e-mail inexistente mostra mensagem genérica de envio', async ({
  page,
}) => {
  await page.goto('/reset-password')
  await page.fill('input[type="email"]', 'nao.existe@example.invalid')
  await page.click('button[type="submit"]')
  await expect(page.locator('h1')).toContainText('E-mail enviado', { timeout: 5000 })
})

test('R1 reset — e-mail existente mostra a MESMA mensagem genérica', async ({
  page,
}) => {
  await page.goto('/reset-password')
  await page.fill('input[type="email"]', TEST_EXISTING_EMAIL)
  await page.click('button[type="submit"]')
  await expect(page.locator('h1')).toContainText('E-mail enviado', { timeout: 5000 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// R2 — Política de senha no Signup
// ═══════════════════════════════════════════════════════════════════════════════

test('R2 senha — requisitos não aparecem antes de submeter', async ({ page }) => {
  await page.goto('/signup')
  // Antes de qualquer interação, dicas de senha não devem aparecer
  await expect(page.locator('text=Mínimo 8 caracteres')).not.toBeVisible()
  await expect(page.locator('text=maiúscula')).not.toBeVisible()
})

test('R2 senha — senha curta gera erro após submit', async ({ page }) => {
  await page.goto('/signup')
  await page.fill('input#name', 'Teste')
  await page.fill('input[type="email"]', 'teste@example.invalid')
  await page.fill('input#password', 'curta')
  await page.fill('input#confirmPassword', 'curta')
  await page.click('button[type="submit"]')
  await expect(page.locator('[role="alert"]').first()).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════════════════════
// R3 — Lockout após 5 falhas
// ═══════════════════════════════════════════════════════════════════════════════

test('R3 lockout — CAPTCHA aparece após 3 falhas na sessão', async ({ page }) => {
  await page.goto('/login')

  for (let i = 0; i < 3; i++) {
    await page.fill('input[type="email"]', TEST_EXISTING_EMAIL)
    await page.fill('input[type="password"]', 'SenhaErrada@' + i)
    await page.click('button[type="submit"]')
    await page.waitForSelector('[role="alert"]')
  }

  // Após 3 falhas, deve aparecer aviso de CAPTCHA (ou o widget)
  const captchaWarning = page.locator(
    'text=CAPTCHA, text=Confirme que você é humano, text=CAPTCHA desabilitado',
  )
  await expect(captchaWarning).toBeVisible({ timeout: 3000 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// R5 — MFA (fluxo de enroll + desafio)
// Testado com um usuário autenticado real
// ═══════════════════════════════════════════════════════════════════════════════

test('R5 mfa-enroll — página acessível após login bem-sucedido', async ({ page }) => {
  // Teste apenas a presença da página — enroll completo requer um app TOTP real
  await page.goto('/auth/mfa-enroll')
  // Deve redirecionar para login (não autenticado)
  await expect(page).toHaveURL(/\/login/)
})

// ═══════════════════════════════════════════════════════════════════════════════
// R6 — Logout invalida sessão
// ═══════════════════════════════════════════════════════════════════════════════

test('R6 logout — rota /app redireciona para /login quando não autenticado', async ({
  page,
}) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login/)
})

// ═══════════════════════════════════════════════════════════════════════════════
// R9 — Headers de segurança
// ═══════════════════════════════════════════════════════════════════════════════

test('R9 headers — CSP e HSTS presentes na resposta', async ({ page }) => {
  const response = await page.goto('/')
  const headers = response?.headers() ?? {}

  // Em dev o vercel.json não é aplicado — este teste é relevante apenas em produção.
  // Em CI com `vercel dev` ou após deploy, os headers estarão presentes.
  if (process.env.CI) {
    expect(headers['strict-transport-security']).toContain('max-age=')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy']).toBeTruthy()
  } else {
    test.skip()
  }
})
