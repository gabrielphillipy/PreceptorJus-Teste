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

// ── CRM ──────────────────────────────────────────────────────────────────────

export type LeadStatus = 'novo' | 'contato' | 'proposta' | 'ganho' | 'perdido'
export type LeadSource = 'manual' | 'landing' | 'indicacao' | 'ads' | 'organico'

export interface CRMLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: LeadSource
  status: LeadStatus
  notes: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export type OrgPlan = 'none' | 'basic' | 'pro' | 'enterprise'
export type OrgStatus = 'prospect' | 'active' | 'churned'

export interface CRMOrganization {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  address: string | null
  plan: OrgPlan
  status: OrgStatus
  notes: string
  created_at: string
  updated_at: string
}

export type DealStage = 'lead' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'

export interface CRMDeal {
  id: string
  title: string
  value: number | null
  stage: DealStage
  lead_id: string | null
  org_id: string | null
  user_id: string | null
  expected_close: string | null
  notes: string
  created_at: string
  updated_at: string
}
