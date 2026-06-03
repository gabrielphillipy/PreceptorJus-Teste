import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  withMinDelay,
  checkPasswordLeak,
  validatePassword,
  writeAuditEvent,
  GENERIC_AUTH_ERROR,
  GENERIC_SIGNUP_SUCCESS,
  GENERIC_RESET_SUCCESS,
} from '@/lib/auth-utils'

export interface AuthResult {
  error: string | null
  success?: boolean
}

export function useAuth() {
  const navigate = useNavigate()
  // Contagem de falhas por sessão — determina quando exigir CAPTCHA (R3)
  const [failureCount, setFailureCount] = useState(0)
  const captchaRequired = failureCount >= 3

  // ─── Login ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (
      email: string,
      password: string,
      captchaToken?: string,
    ): Promise<AuthResult> => {
      // Pré-verificação: lockout + CAPTCHA (server-side, R3)
      const pre = await fetch('/api/auth/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      })
      if (!pre.ok) {
        const body = (await pre.json().catch(() => ({}))) as {
          captchaRequired?: boolean
        }
        if (pre.status === 429) {
          void writeAuditEvent({ action: 'login_locked', metadata: { email } })
          return { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }
        }
        if (pre.status === 403 && body.captchaRequired) {
          setFailureCount((n) => Math.max(n, 3))
          return { error: 'Resolva o CAPTCHA para continuar.' }
        }
        return { error: GENERIC_AUTH_ERROR }
      }

      // Tentativa de login com delay mínimo anti-timing (R1)
      const { data, error } = await withMinDelay(() =>
        supabase.auth.signInWithPassword({ email, password }),
      )

      if (error) {
        setFailureCount((n) => n + 1)
        void fetch('/api/auth/record-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, success: false }),
        })
        void writeAuditEvent({ action: 'login_failure', metadata: { email } })
        // Sempre a mesma mensagem genérica — nunca diferencia e-mail de senha (R1)
        return { error: GENERIC_AUTH_ERROR }
      }

      setFailureCount(0)
      void fetch('/api/auth/record-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, success: true }),
      })
      void writeAuditEvent({ action: 'login_success', actorId: data.user?.id })

      // Verificar se MFA precisa ser completado (R5)
      const { data: mfa } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (mfa?.nextLevel === 'aal2' && mfa?.currentLevel !== 'aal2') {
        navigate('/auth/mfa-challenge')
        return { error: null, success: true }
      }

      navigate('/app')
      return { error: null, success: true }
    },
    [navigate],
  )

  // ─── Cadastro (via proxy para validação server-side completa) ─────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      team?: string,
    ): Promise<AuthResult> => {
      const pwError = validatePassword(password)
      if (pwError) return { error: pwError }

      const leaked = await checkPasswordLeak(password)
      if (leaked) {
        return {
          error:
            'Esta senha consta em bases de dados de vazamentos. Escolha outra senha.',
        }
      }

      // Signup via API proxy — valida server-side + cria usuário com service_role (R2, R8)
      const res = await withMinDelay(() =>
        fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: name.slice(0, 100),
            team: team?.slice(0, 100) ?? null,
          }),
        }),
      )

      // Sempre retornar a mesma mensagem de sucesso (anti-enumeração R1)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        // Erros de validação (senha fraca etc.) são mostrados
        if (res.status === 400 && body.error) return { error: body.error }
        // Qualquer outro erro → mesma mensagem de sucesso (não revela existência)
      }

      void writeAuditEvent({ action: 'signup', metadata: { email } })
      return { error: null, success: true }
    },
    [],
  )

  // ─── Logout (revoga token no servidor, R6) ────────────────────────────────
  const signOut = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    void writeAuditEvent({ action: 'logout', actorId: session?.user?.id })
    await supabase.auth.signOut() // invalida refresh token no servidor
    navigate('/login')
  }, [navigate])

  // ─── Reset de senha ────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    // Sempre retorna sucesso independente da existência do e-mail (R1, R4)
    await withMinDelay(async () => {
      await supabase.auth.resetPasswordForEmail(email, {
        // redirectTo deve estar na allowlist do Supabase Dashboard (R4)
        redirectTo: `${window.location.origin}/reset-confirm`,
      })
    })
    void writeAuditEvent({
      action: 'password_reset_requested',
      metadata: { email },
    })
    return { error: null, success: true }
  }, [])

  // ─── Confirmação do reset (após clicar no link do e-mail) ─────────────────
  const confirmPasswordReset = useCallback(
    async (password: string): Promise<AuthResult> => {
      const pwError = validatePassword(password)
      if (pwError) return { error: pwError }

      const leaked = await checkPasswordLeak(password)
      if (leaked) {
        return {
          error:
            'Esta senha consta em bases de dados de vazamentos. Escolha outra senha.',
        }
      }

      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) {
        return { error: 'Não foi possível redefinir. O link pode ter expirado.' }
      }

      void writeAuditEvent({
        action: 'password_reset_completed',
        actorId: data.user?.id,
      })
      // Invalida todas as outras sessões ativas (R4)
      await supabase.auth.signOut({ scope: 'others' })
      navigate('/login')
      return { error: null, success: true }
    },
    [navigate],
  )

  // ─── MFA: Enroll ──────────────────────────────────────────────────────────
  const enrollMFA = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'PreceptorJus',
    })
    if (error || !data) return { error: 'Erro ao iniciar configuração de MFA.', factorId: null, qrCode: null, secret: null }
    return {
      error: null,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    }
  }, [])

  // ─── MFA: Verificar primeiro código (confirma enroll) ────────────────────
  const verifyMFAEnrollment = useCallback(
    async (factorId: string, code: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (error) return { error: 'Código inválido. Verifique o app autenticador.' }
      void writeAuditEvent({ action: 'mfa_enrolled' })
      return { error: null, success: true }
    },
    [],
  )

  // ─── MFA: Desafio no login ────────────────────────────────────────────────
  const challengeMFA = useCallback(
    async (code: string, factorId: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (error) return { error: 'Código inválido. Tente novamente.' }
      navigate('/app')
      return { error: null, success: true }
    },
    [navigate],
  )

  // ─── MFA: Desabilitar (exige reautenticação completa, R5) ─────────────────
  const disableMFA = useCallback(
    async (password: string, totpCode: string, factorId: string): Promise<AuthResult> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) return { error: 'Sessão inválida.' }

      // Reautenticação com senha
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (reAuthErr) return { error: 'Senha incorreta.' }

      // Verificação TOTP
      const { error: totpErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: totpCode,
      })
      if (totpErr) return { error: 'Código TOTP inválido.' }

      // Remoção do fator via service_role (server-side)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/auth/disable-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ factorId }),
      })
      if (!res.ok) return { error: 'Erro ao desabilitar MFA. Tente novamente.' }

      void writeAuditEvent({ action: 'mfa_disabled' })
      return { error: null, success: true }
    },
    [],
  )

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmPasswordReset,
    enrollMFA,
    verifyMFAEnrollment,
    challengeMFA,
    disableMFA,
    failureCount,
    captchaRequired,
    GENERIC_SIGNUP_SUCCESS,
    GENERIC_RESET_SUCCESS,
  }
}
