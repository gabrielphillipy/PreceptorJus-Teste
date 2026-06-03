# PreceptorJus — Checklist do Supabase Dashboard (R12)

> **Como usar:** execute cada item abaixo no Supabase Dashboard do projeto.
> Marque cada item com a data de conclusão.

---

## 1. Authentication → Settings

| Item | Valor | Status |
|------|-------|--------|
| **Enable email confirmations** | ON | ☐ |
| **Secure email change** | ON | ☐ |
| **Minimum password length** | 8 | ☐ |
| **Password requirements — lowercase** | ON | ☐ |
| **Password requirements — uppercase** | ON | ☐ |
| **Password requirements — numbers** | ON | ☐ |
| **MFA factors — TOTP** | Enabled | ☐ |

> Nota: "Require special character" não está disponível no Dashboard (limitação do Supabase).
> Esta regra é aplicada **server-side** em `api/auth/signup.js` e **client-side** em
> `src/lib/auth-utils.ts`. Usuários que criem contas diretamente pela API anon serão
> bloqueados pelo rate limit de signup definido abaixo.

---

## 2. Authentication → Rate Limits

Configure os valores abaixo (em `Authentication → Rate Limits`):

| Endpoint | Valor recomendado | Motivo |
|----------|-------------------|--------|
| Emails sent per hour | 30 | Limitar e-mails de confirmação/reset |
| Token verifications per hour | 360 | OTP e magic links |
| Sign-ups per hour (anon key) | **0** | Todos os signups passam pelo `/api/auth/signup` |
| Sign-ins per 5 minutes | 30 | Rate limit nativo adicional |
| Password recovery per hour | 10 | Limitar reset requests |

> **Importante:** definir "Sign-ups per hour" como **0** garante que a anon key não possa
> criar usuários diretamente, forçando o uso do `api/auth/signup.js` que faz validação completa.

Status: ☐ Configurado em ____/____/________

---

## 3. Authentication → URL Configuration

### Site URL
```
https://preceptorjus.vercel.app
```

### Redirect URLs Allowlist (R4)
Adicione APENAS estas URLs:

```
https://preceptorjus.vercel.app/reset-confirm
https://preceptorjus.vercel.app/auth/callback
http://localhost:5173/reset-confirm        ← apenas para dev
http://localhost:5173/auth/callback        ← apenas para dev
```

> **Nunca** usar curingas como `*` ou `http://*`. O `redirectTo` em `resetPasswordForEmail`
> usa essas URLs — uma allowlist aberta permite redirect aberto (open redirect, R4).

Status: ☐ Configurado em ____/____/________

---

## 4. Authentication → Email Templates

Revise e personalize os templates para:
- Remover qualquer link externo suspeito
- Adicionar o logotipo e branding PreceptorJus
- Verificar que o link de confirmação/reset aponta para o domínio correto

Templates a revisar:
- [ ] Confirm signup
- [ ] Reset password
- [ ] Magic link (se habilitado)
- [ ] Change email address

Status: ☐ Revisado em ____/____/________

---

## 5. Database → SQL Editor — Aplicar schema.sql

Execute `supabase/schema.sql` no SQL Editor. O script cria:
- `user_profiles` (com RLS por verbo)
- `auth_attempts` (rate limit)
- `audit_log` (imutável, com trigger)
- `mfa_recovery_codes`
- Triggers de proteção de colunas
- Trigger de criação automática de perfil no signup

Status: ☐ Executado em ____/____/________

---

## 6. Promoção do primeiro admin (R8)

> **Não existe mecanismo automático de promoção a admin no signup.**
> O primeiro admin deve ser promovido manualmente pelo proprietário do projeto.

### Procedimento:
1. Acesse `Authentication → Users` e copie o UUID do usuário.
2. Execute no SQL Editor:

```sql
-- Substitua '<user-uuid>' pelo UUID real
UPDATE public.user_profiles
SET role = 'admin', mfa_required = TRUE
WHERE id = '<user-uuid>';
```

3. O usuário precisará configurar MFA na próxima sessão (`mfa_required = TRUE`).
4. Documente aqui quem realizou a promoção e quando:

| Data | Admin promovido (e-mail) | Promovido por |
|------|--------------------------|---------------|
|      |                          |               |

---

## 7. Variáveis de ambiente obrigatórias

### Vercel Project → Settings → Environment Variables

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `SUPABASE_URL` | Secret | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Chave service_role (nunca exposta ao browser) |
| `VITE_SUPABASE_URL` | Plain | Mesma URL (com prefixo VITE_ para o frontend) |
| `VITE_SUPABASE_ANON_KEY` | Plain | Anon/public key (segura para expor) |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile secret (server-side) |
| `VITE_TURNSTILE_SITE_KEY` | Plain | Cloudflare Turnstile site key (browser) |
| `VITE_SENTRY_DSN` | Plain | Sentry DSN para error monitoring |

### Obter as chaves Supabase:
`Dashboard → Settings → API → Project URL + anon key + service_role key`

Status: ☐ Configurado em ____/____/________

---

## 8. Verificação pós-deploy

Antes de ir a produção, verifique manualmente:

- [ ] Login com e-mail correto + senha correta → redireciona para `/app`
- [ ] Login com e-mail errado → mensagem genérica (sem revelar e-mail)
- [ ] Login com senha errada → mesma mensagem genérica
- [ ] Signup com e-mail existente → mesma mensagem de e-mail novo
- [ ] Reset com e-mail existente → "Se o e-mail estiver cadastrado…"
- [ ] Reset com e-mail inexistente → mesma mensagem acima
- [ ] 5 falhas seguidas → conta bloqueada por 15 min
- [ ] Link de reset → redireciona para `/reset-confirm` (na allowlist)
- [ ] Headers de segurança presentes: `strict-transport-security`, `x-content-type-options`, `csp`
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` **não aparece** no bundle JS (seria catastrófico)

---

*Checklist criada em 2026-06-03. Revisar a cada 6 meses ou após mudanças de configuração.*
