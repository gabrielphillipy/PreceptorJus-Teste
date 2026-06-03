import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  code: z
    .string()
    .min(6, 'Código deve ter 6 dígitos')
    .max(10, 'Código muito longo')
    .regex(/^[\dA-Z]+$/, 'Formato inválido'),
})
type FormData = z.infer<typeof schema>

export default function MFAChallenge() {
  const { session, mfaChallengeRequired } = useAuthContext()
  const navigate = useNavigate()
  const { challengeMFA } = useAuth()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)

  useEffect(() => {
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    if (!mfaChallengeRequired) {
      navigate('/app', { replace: true })
      return
    }
    // Obtém o primeiro fator TOTP enrolado
    void (async () => {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.[0]
      if (totp) setFactorId(totp.id)
    })()
  }, [session, mfaChallengeRequired, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!factorId) return
    setError(null)
    setLoading(true)

    if (useRecovery) {
      // Usar código de recuperação (verifica server-side)
      const {
        data: { session: s },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/auth/recovery-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${s?.access_token ?? ''}`,
        },
        body: JSON.stringify({ code: data.code, factorId }),
      })
      setLoading(false)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Código de recuperação inválido.')
        return
      }
      navigate('/app')
      return
    }

    const result = await challengeMFA(data.code, factorId)
    setLoading(false)
    if (result.error) setError(result.error)
  }

  const inputLabel = useRecovery ? 'Código de recuperação' : 'Código do autenticador'
  const placeholder = useRecovery ? 'ABCD1234EF' : '000000'

  return (
    <AuthLayout
      title="Verificação em dois fatores"
      description={
        useRecovery
          ? 'Insira um dos seus códigos de recuperação.'
          : 'Insira o código do seu app autenticador.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="code">{inputLabel}</Label>
          <Input
            id="code"
            type="text"
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 10 : 6}
            placeholder={placeholder}
            aria-invalid={!!errors.code}
            {...register('code')}
          />
          {errors.code && (
            <p role="alert" className="text-red-600 text-xs">{errors.code.message}</p>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || !factorId}>
          {loading ? 'Verificando…' : 'Verificar'}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v)
            setError(null)
          }}
          className="text-sm text-[rgb(var(--brand-primary))] hover:underline"
        >
          {useRecovery ? 'Usar app autenticador' : 'Usar código de recuperação'}
        </button>
      </div>
    </AuthLayout>
  )
}
