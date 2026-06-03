import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    // Aguarda o SDK trocar o code por sessão (PKCE flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/app', { replace: true })
        return
      }
      // Só redireciona para login se não há code na URL (link inválido)
      const hasCode = new URLSearchParams(window.location.search).has('code')
      const hasToken = window.location.hash.includes('access_token')
      if (!hasCode && !hasToken) {
        navigate('/login', { replace: true })
      }
    })

    // Fallback: se demorar mais de 5s sem sessão, vai para login
    const timeout = setTimeout(() => setTimedOut(true), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  useEffect(() => {
    if (timedOut) navigate('/login', { replace: true })
  }, [timedOut, navigate])

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--pjus-canvas)]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 rounded-full border-2 border-[rgb(var(--brand-primary))]/30 border-t-[rgb(var(--brand-primary))] animate-spin" />
        <p className="text-sm text-[rgb(var(--brand-ink-2))]">Confirmando sua conta…</p>
      </div>
    </div>
  )
}
