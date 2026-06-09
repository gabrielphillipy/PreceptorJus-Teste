import { useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/button";
import { useCRMOrgs } from "@/hooks/useCRM";
import type { CRMOrganization, OrgPlan, OrgStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const PLAN_LABELS: Record<OrgPlan, string> = {
  none: "Sem plano",
  basic: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<OrgPlan, string> = {
  none: "bg-brand-ink/8 text-brand-ink-3",
  basic: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
};

const STATUS_LABELS: Record<OrgStatus, string> = {
  prospect: "Prospect",
  active: "Ativa",
  churned: "Churn",
};

const STATUS_COLORS: Record<OrgStatus, string> = {
  prospect: "bg-sky-50 text-sky-700",
  active: "bg-green-50 text-green-700",
  churned: "bg-red-50 text-red-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function NewOrgModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (o: Omit<CRMOrganization, "id" | "created_at" | "updated_at">) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<OrgPlan>("none");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({
      name: name.trim(),
      cnpj: cnpj || null,
      email: email || null,
      phone: phone || null,
      address: null,
      plan,
      status: "prospect",
      notes,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary-darker/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-brand-ink text-lg">Nova organização</h3>
          <button onClick={onClose} className="text-brand-ink-3 hover:text-brand-ink transition-colors">
            <MI name="close" className="text-[20px]" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Nome *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do escritório ou empresa"
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-brand-ink-2 block mb-1">CNPJ</label>
              <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Telefone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 9…"
                className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@escritorio.com" type="email"
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Plano</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value as OrgPlan)}
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 bg-white">
              {(Object.entries(PLAN_LABELS) as [OrgPlan, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observações…"
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving ? "Salvando…" : "Criar organização"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CRMOrgs() {
  const { orgs, loading, error, create, updateStatus, remove } = useCRMOrgs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrgStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = orgs.filter((o) => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleStatusChange(id: string, status: OrgStatus) {
    setUpdatingId(id);
    await updateStatus(id, status);
    setUpdatingId(null);
  }

  return (
    <div className="stack">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MI name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3 text-[18px]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar organização…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--pjus-hairline)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="flex gap-1">
          {(["all", "prospect", "active", "churned"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                statusFilter === s
                  ? "bg-brand-primary text-white"
                  : "bg-white border border-[var(--pjus-hairline)] text-brand-ink-2 hover:border-brand-primary/40",
              )}
            >
              {s === "all" ? "Todas" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <Button size="sm" className="ml-auto" onClick={() => setShowModal(true)}>
          <MI name="add_business" className="text-[16px]" />
          Nova organização
        </Button>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600 flex items-center gap-2">
          <MI name="error" className="text-[20px]" /> {error}
        </div>
      )}

      {loading ? (
        <div className="card p-8 grid place-items-center text-brand-ink-3 text-sm gap-2">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
          Carregando organizações…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 grid place-items-center text-center gap-2">
          <MI name="business_off" className="text-[32px] text-brand-ink-3" />
          <p className="text-sm text-brand-ink-2">Nenhuma organização encontrada.</p>
          <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>Adicionar primeira</Button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--pjus-hairline)] bg-[var(--pjus-canvas)]">
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide">Organização</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide hidden sm:table-cell">Contato</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide hidden md:table-cell">Plano</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide hidden lg:table-cell">Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pjus-hairline)]">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--pjus-canvas)]/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-gold/20 grid place-items-center shrink-0">
                        <MI name="business" className="text-[18px] text-brand-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-ink">{o.name}</p>
                        {o.cnpj && <p className="text-xs text-brand-ink-3">{o.cnpj}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {o.email && <p className="text-xs text-brand-ink-2">{o.email}</p>}
                      {o.phone && <p className="text-xs text-brand-ink-3">{o.phone}</p>}
                      {!o.email && !o.phone && <span className="text-xs text-brand-ink-3">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", PLAN_COLORS[o.plan])}>
                      {PLAN_LABELS[o.plan]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {updatingId === o.id ? (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                    ) : (
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value as OrgStatus)}
                        className={cn("text-xs font-semibold px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30", STATUS_COLORS[o.status])}
                      >
                        {(Object.entries(STATUS_LABELS) as [OrgStatus, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-ink-3 hidden lg:table-cell">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(o.id)} className="text-brand-ink-3 hover:text-red-500 transition-colors">
                      <MI name="delete" className="text-[18px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <NewOrgModal onClose={() => setShowModal(false)} onCreate={create} />}
    </div>
  );
}
