import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthLayout from './AuthLayout'
import PasswordField from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth-utils'

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export default function ResetConfirm() {
  const { session } = useAuthContext()
  const navigate = useNavigate()
  const { confirmPasswordReset } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // O Supabase SDK detecta o token de recovery na URL e emite PASSWORD_RECOVERY
  // via onAuthStateChange — a sessão fica disponível no contexto com type recovery.
  useEffect(() => {
    // Se não há session depois de um tick, o link pode ter expirado
    const t = setTimeout(() => {
      if (!session) {
        navigate('/reset-password', { replace: true })
      } else {
        setReady(true)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [session, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)
    const result = await confirmPasswordReset(data.password)
    setLoading(false)
    if (result.error) setError(result.error)
    // Em caso de sucesso, o hook navega para /login
  }

  if (!ready) {
    return (
      <AuthLayout title="Verificando link…">
        <div className="flex justify-center py-4">
          <span className="h-6 w-6 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar nova senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PasswordField
          id="password"
          label="Nova senha"
          autoComplete="new-password"
          showHintOnError
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirmar nova senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}
