import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PasswordField from '@/components/auth/PasswordField'
import CaptchaWidget, { type CaptchaRef } from '@/components/auth/CaptchaWidget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'

// ─── Schemas ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido').max(254),
  password: z.string().min(1, 'Senha obrigatória'),
})
const signupSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
    team: z.string().max(100).optional(),
    email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido').max(254),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type LoginData = z.infer<typeof loginSchema>
type SignupData = z.infer<typeof signupSchema>
type Tab = 'login' | 'signup'

// ─── Copy por tab ────────────────────────────────────────────────────────────
const COPY = {
  login: {
    eyebrow: 'ENTRAR NA CONTA',
    headline: 'Continue seus estudos.',
    sub: 'Sua biblioteca, resumos e flashcards estão esperando.',
  },
  signup: {
    eyebrow: 'CRIAR CONTA GRATUITA',
    headline: 'Comece a estudar hoje.',
    sub: 'IA jurídica de precisão. Para OAB, concursos e pós-graduação.',
  },
}

export default function AuthPage() {
  const { session, loading } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab: Tab = location.pathname === '/signup' ? 'signup' : 'login'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPasswordHints, setShowPasswordHints] = useState(false)
  const captchaRef = useRef<CaptchaRef>(null)

  const { signIn, signUp, captchaRequired, GENERIC_SIGNUP_SUCCESS } = useAuth()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app'

  useEffect(() => {
    if (!loading && session) navigate(from, { replace: true })
  }, [session, loading, navigate, from])

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) })

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setSuccessMsg(null)
    setShowPasswordHints(false)
    navigate(t === 'signup' ? '/signup' : '/login', { replace: true })
  }

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    })
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  const onLogin = async (data: LoginData) => {
    setError(null)
    const token = captchaRequired ? (captchaRef.current?.getToken() ?? undefined) : undefined
    if (captchaRequired && !token) {
      setError('Resolva o CAPTCHA antes de continuar.')
      return
    }
    setSubmitting(true)
    const result = await signIn(data.email, data.password, token)
    captchaRef.current?.reset()
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  // ── Signup ──────────────────────────────────────────────────────────────────
  const onSignup = async (data: SignupData) => {
    setError(null)
    setShowPasswordHints(true)
    setSubmitting(true)
    const result = await signUp(data.email, data.password, data.name, data.team)
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    setSuccessMsg(GENERIC_SIGNUP_SUCCESS)
  }

  const copy = COPY[tab]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Topo */}
      <div className="px-6 pt-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[rgb(var(--brand-ink-2))] text-sm hover:text-[rgb(var(--brand-ink))] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
      </div>

      {/* Conteúdo central */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <p className="text-[rgb(var(--brand-primary))] font-extrabold text-2xl tracking-tight font-[Manrope] leading-none">
              PreceptorJus
            </p>
            <p className="text-[var(--pjus-gold-deep)] text-[10px] font-semibold tracking-[0.2em] uppercase mt-0.5">
              Estudo Jurídico com IA
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-full bg-[var(--pjus-surface-3)] p-1 mb-8">
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-white text-[rgb(var(--brand-ink))] shadow-sm'
                    : 'text-[rgb(var(--brand-ink-2))] hover:text-[rgb(var(--brand-ink))]'
                }`}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Copy */}
          <div className="mb-6">
            <p className="text-[var(--pjus-gold-deep)] text-[10px] font-semibold tracking-[0.18em] uppercase mb-2">
              {copy.eyebrow}
            </p>
            <h1 className="text-[rgb(var(--brand-ink))] text-3xl font-extrabold font-[Manrope] leading-tight mb-1">
              {copy.headline}
            </h1>
            <p className="text-[rgb(var(--brand-ink-2))] text-sm">{copy.sub}</p>
          </div>

          {/* Mensagem de sucesso (signup) */}
          {successMsg && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 mb-4">
              <strong>E-mail enviado!</strong> {successMsg}
            </div>
          )}

          {!successMsg && (
            <>

              {/* ── FORM LOGIN ─────────────────────────────────────────────────── */}
              {tab === 'login' && (
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3.5" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="l-email">E-mail</Label>
                    <Input
                      id="l-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      maxLength={254}
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p role="alert" className="text-red-600 text-xs">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="l-password">Senha</Label>
                      <Link to="/reset-password" className="text-xs text-[rgb(var(--brand-primary))] hover:underline">
                        Esqueci minha senha
                      </Link>
                    </div>
                    <PasswordField
                      id="l-password"
                      label=""
                      autoComplete="current-password"
                      error={loginForm.formState.errors.password?.message}
                      {...loginForm.register('password')}
                    />
                  </div>

                  {captchaRequired && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[rgb(var(--brand-ink-2))]">Confirme que você é humano:</p>
                      <CaptchaWidget ref={captchaRef} />
                    </div>
                  )}

                  {error && (
                    <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[rgb(var(--brand-primary))] hover:bg-[var(--pjus-primary-mist)] text-white rounded-xl h-11 font-semibold"
                  >
                    {submitting ? 'Entrando…' : 'Entrar'}
                  </Button>
                </form>
              )}

              {/* ── FORM SIGNUP ────────────────────────────────────────────────── */}
              {tab === 'signup' && (
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-3.5" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-name">Nome completo</Label>
                    <Input
                      id="s-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Como seus colegas te chamam"
                      maxLength={100}
                      {...signupForm.register('name')}
                    />
                    {signupForm.formState.errors.name && (
                      <p role="alert" className="text-red-600 text-xs">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="s-email">E-mail</Label>
                    <Input
                      id="s-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      maxLength={254}
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p role="alert" className="text-red-600 text-xs">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <PasswordField
                    id="s-password"
                    label="Senha"
                    autoComplete="new-password"
                    placeholder="Mín. 8 caracteres"
                    showHintOnError={showPasswordHints}
                    error={showPasswordHints ? signupForm.formState.errors.password?.message : undefined}
                    {...signupForm.register('password')}
                  />

                  <PasswordField
                    id="s-confirm"
                    label="Confirmar senha"
                    autoComplete="new-password"
                    error={signupForm.formState.errors.confirmPassword?.message}
                    {...signupForm.register('confirmPassword')}
                  />

                  {error && (
                    <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[rgb(var(--brand-primary))] hover:bg-[var(--pjus-primary-mist)] text-white rounded-xl h-11 font-semibold"
                  >
                    {submitting ? 'Criando conta…' : 'Criar conta gratuita'}
                  </Button>

                  <p className="text-xs text-center text-[var(--pjus-ink-3)]">
                    Ao criar conta você concorda com os{' '}
                    <a href="/terms" className="underline">Termos de Uso</a>{' '}
                    e a{' '}
                    <a href="/privacy" className="underline">Política de Privacidade</a>.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
