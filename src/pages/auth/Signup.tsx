import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthLayout from './AuthLayout'
import PasswordField from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth-utils'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100, 'Nome muito longo'),
  team: z.string().max(100, 'Equipe muito longa').optional(),
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido').max(254),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(128, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function Signup() {
  const { session, loading } = useAuthContext()
  const navigate = useNavigate()
  const { signUp, GENERIC_SIGNUP_SUCCESS } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Exibe requisitos de senha somente após tentativa inválida (R2)
  const [showPasswordHints, setShowPasswordHints] = useState(false)

  useEffect(() => {
    if (!loading && session) navigate('/app', { replace: true })
  }, [session, loading, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setShowPasswordHints(true) // libera dicas apenas quando tentou submeter
    setSubmitting(true)
    const result = await signUp(data.email, data.password, data.name, data.team)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[rgb(var(--brand-ink-2))] text-sm">{GENERIC_SIGNUP_SUCCESS}</p>
          <p className="text-xs text-[var(--pjus-ink-3)]">
            Após confirmar, volte aqui para{' '}
            <Link to="/login" className="text-[rgb(var(--brand-primary))] hover:underline">
              entrar
            </Link>
            .
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar conta" description="Comece a estudar com o PreceptorJus">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            maxLength={100}
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p role="alert" className="text-red-600 text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="team">
            Equipe / Turma{' '}
            <span className="text-[var(--pjus-ink-4)] font-normal">(opcional)</span>
          </Label>
          <Input
            id="team"
            type="text"
            placeholder="Ex: OAB SP 2025"
            maxLength={100}
            {...register('team')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            maxLength={254}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-red-600 text-xs">{errors.email.message}</p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Senha"
          autoComplete="new-password"
          // showHintOnError: exibe dicas somente após tentativa de envio (R2)
          showHintOnError={showPasswordHints}
          error={showPasswordHints ? errors.password?.message : undefined}
          {...register('password')}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirmar senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting || loading}>
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </Button>

        <p className="text-xs text-center text-[var(--pjus-ink-3)]">
          Ao criar conta você confirma ter lido nossa{' '}
          <a href="/privacy" className="text-[rgb(var(--brand-primary))] hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[rgb(var(--brand-ink-2))]">
        Já tem conta?{' '}
        <Link to="/login" className="text-[rgb(var(--brand-primary))] hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
