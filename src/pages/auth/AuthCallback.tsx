import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// Recebe o redirect após confirmação de e-mail ou OAuth.
// O SDK processa o token/code da URL e dispara onAuthStateChange.
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/app', { replace: true })
      } else if (event === 'INITIAL_SESSION' && !session) {
        // Token expirado ou inválido
        navigate('/login?error=link_expirado', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
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
