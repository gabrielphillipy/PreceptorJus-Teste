-- ══════════════════════════════════════════════════════════════════════════════
-- PreceptorJus — Auth Schema (R7, R8, R10)
-- Aplique APÓS supabase/migrations/001_init.sql
-- Execute no SQL Editor do Supabase (Settings → SQL Editor) com uma única transação.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. user_profiles ─────────────────────────────────────────────────────────
-- Metadados do usuário separados da tabela auth.users (que é gerenciada pelo Supabase).
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  team         TEXT        CHECK (team IS NULL OR char_length(team) <= 100),
  role         TEXT        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('member', 'manager', 'admin')),
  mfa_required BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles (role);

-- ── 2. auth_attempts ─────────────────────────────────────────────────────────
-- Registro de tentativas de login para rate limiting e lockout (R3).
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL CHECK (char_length(email) <= 254),
  ip         TEXT        CHECK (ip IS NULL OR char_length(ip) <= 45),
  success    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_attempts_email_time_idx
  ON public.auth_attempts (email, created_at DESC);

-- Limpeza automática de tentativas antigas (mantém apenas últimas 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- ── 3. audit_log ─────────────────────────────────────────────────────────────
-- Log imutável de eventos de segurança (R10).
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL CHECK (char_length(action) <= 64),
  target_id  TEXT        CHECK (target_id IS NULL OR char_length(target_id) <= 128),
  ip         TEXT        CHECK (ip IS NULL OR char_length(ip) <= 45),
  user_agent TEXT        CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  metadata   JSONB
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx  ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_log_time_idx   ON public.audit_log (timestamp DESC);

-- Imutabilidade: impede UPDATE e DELETE em audit_log (R10)
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é imutável — registros não podem ser alterados ou excluídos';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_immutable ON public.audit_log;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- ── 4. mfa_recovery_codes ────────────────────────────────────────────────────
-- Códigos de recuperação de uso único para MFA (R5).
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL, -- SHA-256 do código em plaintext
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_user_idx
  ON public.mfa_recovery_codes (user_id);

-- ── 5. Funções auxiliares ────────────────────────────────────────────────────

-- updated_at automático (R7)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Criação automática do perfil no signup (R7)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, team)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'team', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Proteção de colunas sensíveis: impede que o próprio usuário altere role/mfa_required (R7)
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Somente service_role (auth.uid() IS NULL) pode alterar role e mfa_required
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Alteração de role requer permissão de administrador';
    END IF;
    IF NEW.mfa_required <> OLD.mfa_required THEN
      RAISE EXCEPTION 'Alteração de mfa_required requer permissão de administrador';
    END IF;
    IF NEW.id <> OLD.id THEN
      RAISE EXCEPTION 'Alteração de id não permitida';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive ON public.user_profiles;
CREATE TRIGGER protect_profile_sensitive
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_columns();

-- Função para verificar lockout (usada pelo pre-login.js via RPC) (R3)
CREATE OR REPLACE FUNCTION public.check_login_lockout(
  p_email TEXT,
  p_threshold INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.auth_attempts
  WHERE email = LOWER(TRIM(p_email))
    AND success = FALSE
    AND created_at > NOW() - (p_window_minutes * INTERVAL '1 minute');
  RETURN v_count >= p_threshold;
END;
$$;

-- ── 6. RLS — Row Level Security (R7) ─────────────────────────────────────────

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê só o próprio perfil
CREATE POLICY "profile_select_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: feito pelo trigger handle_new_user (service_role)
CREATE POLICY "profile_insert_service"
  ON public.user_profiles FOR INSERT
  WITH CHECK (FALSE); -- bloqueia insert direto pela anon key; service_role bypassa RLS

-- UPDATE: usuário pode atualizar nome e team (coluna role protegida pelo trigger)
CREATE POLICY "profile_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: bloqueado (service_role gerencia)
CREATE POLICY "profile_delete_deny"
  ON public.user_profiles FOR DELETE
  USING (FALSE);

-- auth_attempts — apenas service_role acessa
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempts_deny_all"
  ON public.auth_attempts FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);

-- audit_log — usuário pode ver os próprios eventos; escrita somente via service_role
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_own"
  ON public.audit_log FOR SELECT
  USING (actor_id = auth.uid());

CREATE POLICY "audit_insert_deny"
  ON public.audit_log FOR INSERT
  WITH CHECK (FALSE); -- service_role bypassa RLS

CREATE POLICY "audit_update_deny"
  ON public.audit_log FOR UPDATE
  USING (FALSE);

CREATE POLICY "audit_delete_deny"
  ON public.audit_log FOR DELETE
  USING (FALSE);

-- mfa_recovery_codes — usuário vê/usa apenas os próprios
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recovery_access_own"
  ON public.mfa_recovery_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Adaptar tabelas existentes para aceitar user_id (futuro) ───────────────
-- Mantém compatibilidade com o sistema device_id existente.
-- TODO: em uma próxima migration, adicionar coluna user_id NULLABLE nas tabelas
-- studies/exams e criar políticas que permitam acesso por user_id OU device_id.

COMMIT;
