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

const schema = z.object({
  code: z
    .string()
    .length(6, 'Código deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'Somente números'),
})
type FormData = z.infer<typeof schema>

// Gera 8 códigos de recuperação alfanuméricos de 10 chars (R5)
function generateRecoveryCodes(): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () =>
    Array.from(
      { length: 10 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join(''),
  )
}

type Step = 'qr' | 'codes'

export default function MFAEnroll() {
  const { session } = useAuthContext()
  const navigate = useNavigate()
  const { enrollMFA, verifyMFAEnrollment } = useAuth()

  const [step, setStep] = useState<Step>('qr')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    void (async () => {
      setLoading(true)
      const result = await enrollMFA()
      setLoading(false)
      if (result.error || !result.factorId) {
        setInitError(result.error ?? 'Erro ao iniciar configuração.')
        return
      }
      setFactorId(result.factorId)
      setQrCode(result.qrCode)
      setSecret(result.secret)
    })()
  }, [session, navigate, enrollMFA])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!factorId) return
    setError(null)
    setLoading(true)
    const result = await verifyMFAEnrollment(factorId, data.code)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // Enroll confirmado — gera códigos de recuperação e mostra ao usuário
    const codes = generateRecoveryCodes()
    setRecoveryCodes(codes)

    // Salva hashes dos códigos no servidor (R5)
    void fetch('/api/auth/mfa-recovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ codes }),
    })

    setStep('codes')
  }

  if (initError) {
    return (
      <AuthLayout title="Erro ao configurar MFA">
        <p className="text-red-600 text-sm">{initError}</p>
        <Button className="w-full mt-4" onClick={() => navigate('/app')}>
          Voltar ao app
        </Button>
      </AuthLayout>
    )
  }

  if (step === 'codes') {
    return (
      <AuthLayout title="Códigos de recuperação" description="Guarde em local seguro — cada código só pode ser usado uma vez.">
        <div className="space-y-4">
          <div className="bg-[var(--pjus-surface-3)] rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-2">
            {recoveryCodes.map((c) => (
              <span key={c} className="text-[rgb(var(--brand-ink))] tracking-wider">
                {c}
              </span>
            ))}
          </div>
          <p className="text-xs text-[var(--pjus-ink-3)]">
            Estes códigos não serão mostrados novamente. Salve-os em um gerenciador de senhas.
          </p>
          <Button className="w-full" onClick={() => navigate('/app')}>
            Entendi, ir para o app
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Configurar autenticação em dois fatores"
      description="Use um app como Google Authenticator ou Authy."
    >
      <div className="space-y-5">
        {loading && !qrCode && (
          <div className="flex justify-center py-4">
            <span className="h-6 w-6 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
          </div>
        )}

        {qrCode && (
          <>
            <div className="flex justify-center">
              <img
                src={qrCode}
                alt="QR Code para configurar TOTP"
                className="w-40 h-40 rounded-lg border border-[var(--pjus-hairline)]"
              />
            </div>

            {secret && (
              <div className="text-center">
                <p className="text-xs text-[var(--pjus-ink-3)] mb-1">
                  Não consegue escanear? Use a chave manual:
                </p>
                <code className="text-xs font-mono bg-[var(--pjus-surface-3)] px-2 py-1 rounded select-all">
                  {secret}
                </code>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="code">Código de 6 dígitos</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando…' : 'Ativar MFA'}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
