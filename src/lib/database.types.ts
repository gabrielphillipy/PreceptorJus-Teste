export type UserRole = 'member' | 'manager' | 'admin'

export interface UserProfile {
  id: string
  name: string
  team: string | null
  role: UserRole
  mfa_required: boolean
  created_at: string
  updated_at: string
}

export type AuditAction =
  | 'signup'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'role_changed'
  | 'email_changed'
  | 'mfa_enrolled'
  | 'mfa_disabled'
  | 'login_locked'
