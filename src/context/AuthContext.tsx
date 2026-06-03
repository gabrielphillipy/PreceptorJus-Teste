import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/database.types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  mfaChallengeRequired: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    mfaChallengeRequired: false,
  })

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return (data as UserProfile | null) ?? null
  }, [])

  const checkMFAChallenge = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2'
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!mounted) return
      const user = session?.user ?? null
      const [profile, mfaChallengeRequired] = await Promise.all([
        user ? fetchProfile(user.id) : Promise.resolve(null),
        session ? checkMFAChallenge() : Promise.resolve(false),
      ])
      if (mounted) {
        setState({ session, user, profile, loading: false, mfaChallengeRequired })
      }
    }
    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      const user = session?.user ?? null
      const [profile, mfaChallengeRequired] = await Promise.all([
        user ? fetchProfile(user.id) : Promise.resolve(null),
        session && event !== 'SIGNED_OUT' ? checkMFAChallenge() : Promise.resolve(false),
      ])
      if (mounted) {
        setState({ session, user, profile, loading: false, mfaChallengeRequired })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, checkMFAChallenge])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>')
  return ctx
}
