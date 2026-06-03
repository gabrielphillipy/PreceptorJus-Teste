import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthLayout from './AuthLayout'
import PasswordField from '@/components/auth/PasswordField'
import CaptchaWidget, { type CaptchaRef } from '@/components/auth/CaptchaWidget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'

const schema = z.object({
  email: z
    .string()
    .min(1, 'E-mail obrigatório')
    .email('E-mail inválido')
    .max(254, 'E-mail muito longo'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const { session, loading } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, captchaRequired, failureCount } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const captchaRef = useRef<CaptchaRef>(null)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app'

  // Redireciona se já autenticado
  useEffect(() => {
    if (!loading && session) navigate(from, { replace: true })
  }, [session, loading, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)

    if (captchaRequired) {
      const token = captchaRef.current?.getToken()
      if (!token) {
        setError('Resolva o CAPTCHA antes de continuar.')
        return
      }
      setSubmitting(true)
      const result = await signIn(data.email, data.password, token)
      captchaRef.current?.reset()
      if (result.error) setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    const result = await signIn(data.email, data.password)
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  return (
    <AuthLayout title="Entrar" description="Acesse sua conta PreceptorJus">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            maxLength={254}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-err' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-err" role="alert" className="text-red-600 text-xs">
              {errors.email.message}
            </p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {/* CAPTCHA aparece após 3 falhas na mesma sessão (R3) */}
        {captchaRequired && (
          <div className="space-y-1.5">
            <p className="text-xs text-[rgb(var(--brand-ink-2))]">
              Confirme que você é humano para continuar.
            </p>
            <CaptchaWidget ref={captchaRef} />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
            {failureCount >= 5 && (
              <span className="block text-xs mt-0.5 text-red-500">
                Conta bloqueada temporariamente. Tente novamente em 15 minutos.
              </span>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting || loading}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-[rgb(var(--brand-ink-2))]">
        <p>
          <Link
            to="/reset-password"
            className="text-[rgb(var(--brand-primary))] hover:underline font-medium"
          >
            Esqueci minha senha
          </Link>
        </p>
        <p>
          Não tem conta?{' '}
          <Link
            to="/signup"
            className="text-[rgb(var(--brand-primary))] hover:underline font-medium"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
