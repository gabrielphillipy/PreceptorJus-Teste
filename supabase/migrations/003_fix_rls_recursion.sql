-- PreceptorJus — corrige recursão infinita no RLS de user_profiles
--
-- A policy "admin_read_all_profiles" (migration 002) consultava user_profiles
-- DENTRO da própria policy de user_profiles → recursão infinita → erro 500 em
-- TODA leitura de perfil. Isso quebrava o carregamento do perfil/role no app
-- (logo, o CRM e o grupo Admin nunca apareciam) e as queries do CRM.

-- Função SECURITY DEFINER: lê o role IGNORANDO o RLS (roda como dono da função),
-- então não dispara as policies de user_profiles → sem recursão.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Substitui a policy recursiva por uma que usa a função (sem recursão).
DROP POLICY IF EXISTS "admin_read_all_profiles" ON user_profiles;
CREATE POLICY "profiles_self_or_admin_read" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Reescreve as policies do CRM para usar a função (evita disparar o RLS de
-- user_profiles de dentro da policy de outra tabela).
DROP POLICY IF EXISTS "admin_only_leads" ON crm_leads;
CREATE POLICY "admin_only_leads" ON crm_leads FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_only_orgs" ON crm_organizations;
CREATE POLICY "admin_only_orgs" ON crm_organizations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_only_deals" ON crm_deals;
CREATE POLICY "admin_only_deals" ON crm_deals FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
