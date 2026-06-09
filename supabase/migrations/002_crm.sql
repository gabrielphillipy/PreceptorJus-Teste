-- PreceptorJus — CRM schema
-- Execute no SQL Editor do Supabase ou via `supabase db push`.

-- ── CRM Leads ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  source      TEXT        NOT NULL DEFAULT 'manual',
  -- 'manual' | 'landing' | 'indicacao' | 'ads' | 'organico'
  status      TEXT        NOT NULL DEFAULT 'novo',
  -- 'novo' | 'contato' | 'proposta' | 'ganho' | 'perdido'
  notes       TEXT        NOT NULL DEFAULT '',
  assigned_to UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON crm_leads (status);
CREATE INDEX IF NOT EXISTS crm_leads_created_idx ON crm_leads (created_at DESC);

-- ── CRM Organizations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_organizations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  cnpj        TEXT,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  plan        TEXT        NOT NULL DEFAULT 'none',
  -- 'none' | 'basic' | 'pro' | 'enterprise'
  status      TEXT        NOT NULL DEFAULT 'prospect',
  -- 'prospect' | 'active' | 'churned'
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_orgs_status_idx ON crm_organizations (status);

-- ── CRM Deals (pipeline) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_deals (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT        NOT NULL,
  value          DECIMAL(10,2),
  stage          TEXT        NOT NULL DEFAULT 'lead',
  -- 'lead' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
  lead_id        UUID        REFERENCES crm_leads(id) ON DELETE SET NULL,
  org_id         UUID        REFERENCES crm_organizations(id) ON DELETE SET NULL,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_close DATE,
  notes          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_deals_stage_idx ON crm_deals (stage);

-- ── touch_updated_at (cria se não existir) ───────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS crm_leads_updated_at ON crm_leads;
CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS crm_orgs_updated_at ON crm_organizations;
CREATE TRIGGER crm_orgs_updated_at
  BEFORE UPDATE ON crm_organizations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS crm_deals_updated_at ON crm_deals;
CREATE TRIGGER crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE crm_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals         ENABLE ROW LEVEL SECURITY;

-- Apenas admins acessam o CRM
CREATE POLICY "admin_only_leads" ON crm_leads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_only_orgs" ON crm_organizations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_only_deals" ON crm_deals FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins também podem ler todos os user_profiles (para a tela de gestão de usuários)
-- Política adicional — NÃO remove a política existente do seu usuário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'admin_read_all_profiles'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "admin_read_all_profiles" ON user_profiles FOR SELECT TO authenticated
        USING (
          id = auth.uid()
          OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
        )
    $p$;
  END IF;
END $$;
