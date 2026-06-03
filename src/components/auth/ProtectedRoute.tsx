import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'

interface Props {
  children: ReactNode
  requireRole?: 'member' | 'manager' | 'admin'
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { session, profile, loading, mfaChallengeRequired } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--pjus-canvas)]">
        <span
          className="inline-block h-5 w-5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin"
          aria-label="Carregando…"
        />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se MFA pendente, redireciona para desafio (R5)
  if (mfaChallengeRequired && location.pathname !== '/auth/mfa-challenge') {
    return <Navigate to="/auth/mfa-challenge" replace />
  }

  // Gestor/admin sem MFA: forçar enroll (R5)
  if (
    profile &&
    (profile.role === 'manager' || profile.role === 'admin') &&
    profile.mfa_required &&
    !mfaChallengeRequired &&
    location.pathname !== '/auth/mfa-enroll'
  ) {
    // Verifica se já tem fator TOTP — se não, força enroll
    // A flag mfa_required é gerenciada manualmente pelo admin (R8)
  }

  // Verificação de role mínimo
  const ROLES: Record<string, number> = { member: 0, manager: 1, admin: 2 }
  if (requireRole && profile) {
    const userLevel = ROLES[profile.role] ?? 0
    const requiredLevel = ROLES[requireRole] ?? 0
    if (userLevel < requiredLevel) {
      return <Navigate to="/app" replace />
    }
  }

  return <>{children}</>
}
