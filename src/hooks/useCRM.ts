import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CRMLead, CRMOrganization, CRMDeal, UserProfile, LeadStatus, OrgStatus, DealStage, UserRole } from "@/lib/database.types";

// ── Users ─────────────────────────────────────────────────────────────────────

export function useCRMUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setUsers((data as UserProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateRole = useCallback(async (id: string, role: UserRole) => {
    const { error } = await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", id);
    if (!error) setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
    return error;
  }, []);

  return { users, loading, error, reload: load, updateRole };
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export function useCRMLeads() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setLeads((data as CRMLead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (lead: Omit<CRMLead, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("crm_leads").insert(lead).select().single();
    if (!error && data) setLeads((prev) => [data as CRMLead, ...prev]);
    return error;
  }, []);

  const updateStatus = useCallback(async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from("crm_leads").update({ status }).eq("id", id);
    if (!error) setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    return error;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (!error) setLeads((prev) => prev.filter((l) => l.id !== id));
    return error;
  }, []);

  return { leads, loading, error, reload: load, create, updateStatus, remove };
}

// ── Organizations ─────────────────────────────────────────────────────────────

export function useCRMOrgs() {
  const [orgs, setOrgs] = useState<CRMOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setOrgs((data as CRMOrganization[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (org: Omit<CRMOrganization, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("crm_organizations").insert(org).select().single();
    if (!error && data) setOrgs((prev) => [data as CRMOrganization, ...prev]);
    return error;
  }, []);

  const updateStatus = useCallback(async (id: string, status: OrgStatus) => {
    const { error } = await supabase.from("crm_organizations").update({ status }).eq("id", id);
    if (!error) setOrgs((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    return error;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("crm_organizations").delete().eq("id", id);
    if (!error) setOrgs((prev) => prev.filter((o) => o.id !== id));
    return error;
  }, []);

  return { orgs, loading, error, reload: load, create, updateStatus, remove };
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export function useCRMDeals() {
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_deals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setDeals((data as CRMDeal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (deal: Omit<CRMDeal, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("crm_deals").insert(deal).select().single();
    if (!error && data) setDeals((prev) => [data as CRMDeal, ...prev]);
    return error;
  }, []);

  const updateStage = useCallback(async (id: string, stage: DealStage) => {
    const { error } = await supabase.from("crm_deals").update({ stage }).eq("id", id);
    if (!error) setDeals((prev) => prev.map((d) => d.id === id ? { ...d, stage } : d));
    return error;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("crm_deals").delete().eq("id", id);
    if (!error) setDeals((prev) => prev.filter((d) => d.id !== id));
    return error;
  }, []);

  return { deals, loading, error, reload: load, create, updateStage, remove };
}
