import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// Rota intermediária que recebe o token do link de confirmação de e-mail
// e redireciona para o app após o SDK processar a sessão.
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app', { replace: true })
      } else {
        // Se chegou aqui sem sessão, o link pode ter expirado
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--pjus-canvas)]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 rounded-full border-2 border-[rgb(var(--brand-primary))]/30 border-t-[rgb(var(--brand-primary))] animate-spin" />
        <p className="text-sm text-[rgb(var(--brand-ink-2))]">Confirmando sua conta…</p>
      </div>
    </div>
  )
}
