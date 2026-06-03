import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido').max(254),
})
type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const { resetPassword, GENERIC_RESET_SUCCESS } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    await resetPassword(data.email)
    setLoading(false)
    // Sempre exibe a mesma mensagem de sucesso, seja o e-mail válido ou não (R1/R4)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout title="E-mail enviado">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[rgb(var(--brand-ink-2))] text-sm">{GENERIC_RESET_SUCCESS}</p>
          <p className="text-xs text-[var(--pjus-ink-3)]">O link expira em 1 hora.</p>
        </div>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-[rgb(var(--brand-primary))] hover:underline font-medium">
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      description="Informe seu e-mail e enviaremos um link."
    >
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
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-red-600 text-xs">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar link de redefinição'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-[rgb(var(--brand-primary))] hover:underline font-medium">
          Voltar ao login
        </Link>
      </div>
    </AuthLayout>
  )
}
