import { useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/button";
import { useCRMLeads } from "@/hooks/useCRM";
import type { CRMLead, LeadStatus, LeadSource } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const STAGES: { key: LeadStatus; label: string; color: string; bg: string }[] = [
  { key: "novo",     label: "Novo",     color: "text-blue-600",  bg: "bg-blue-50" },
  { key: "contato",  label: "Contato",  color: "text-violet-600", bg: "bg-violet-50" },
  { key: "proposta", label: "Proposta", color: "text-amber-600",  bg: "bg-amber-50" },
  { key: "ganho",    label: "Ganho",    color: "text-green-700",  bg: "bg-green-50" },
  { key: "perdido",  label: "Perdido",  color: "text-red-600",    bg: "bg-red-50" },
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  manual: "Manual",
  landing: "Landing page",
  indicacao: "Indicação",
  ads: "Anúncio",
  organico: "Orgânico",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function NewLeadModal({ onClose, onCreate }: { onClose: () => void; onCreate: (l: Omit<CRMLead, "id" | "created_at" | "updated_at">) => Promise<unknown> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("manual");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({ name: name.trim(), email: email || null, phone: phone || null, source, status: "novo", notes, assigned_to: null });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary-darker/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-brand-ink text-lg">Novo lead</h3>
          <button onClick={onClose} className="text-brand-ink-3 hover:text-brand-ink transition-colors">
            <MI name="close" className="text-[20px]" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Nome *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead"
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-brand-ink-2 block mb-1">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email"
                className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Telefone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 9…"
                className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Origem</label>
            <select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 bg-white">
              {(Object.entries(SOURCE_LABELS) as [LeadSource, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-ink-2 block mb-1">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contexto, observações…"
              className="w-full px-3 py-2 text-sm border border-[var(--pjus-hairline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving ? "Salvando…" : "Criar lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadCard({ lead, onStatusChange, onDelete }: {
  lead: CRMLead;
  onStatusChange: (id: string, s: LeadStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--pjus-hairline)] p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-brand-ink leading-tight">{lead.name}</span>
        <button onClick={() => onDelete(lead.id)} className="text-brand-ink-3 hover:text-red-500 transition-colors shrink-0">
          <MI name="delete" className="text-[16px]" />
        </button>
      </div>
      {lead.email && (
        <p className="text-xs text-brand-ink-3 truncate">{lead.email}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-brand-ink-3">{SOURCE_LABELS[lead.source]}</span>
        <span className="text-[10px] text-brand-ink-3">{fmtDate(lead.created_at)}</span>
      </div>
      <select
        value={lead.status}
        onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
        className="w-full text-[11px] font-semibold px-2 py-1 rounded-md border border-[var(--pjus-hairline)] bg-[var(--pjus-canvas)] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function CRMLeads() {
  const { leads, loading, error, create, updateStatus, remove } = useCRMLeads();
  const [showModal, setShowModal] = useState(false);

  const byStage = (status: LeadStatus) => leads.filter((l) => l.status === status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-ink-2">
          {leads.length} {leads.length === 1 ? "lead" : "leads"} no total
        </p>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <MI name="person_add" className="text-[16px]" />
          Novo lead
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
          Carregando leads…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGES.map((stage) => {
            const items = byStage(stage.key);
            return (
              <div key={stage.key} className="space-y-2">
                <div className={cn("flex items-center justify-between px-2 py-1.5 rounded-lg", stage.bg)}>
                  <span className={cn("text-xs font-bold", stage.color)}>{stage.label}</span>
                  <span className={cn("text-xs font-bold tabular-nums", stage.color)}>{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onStatusChange={updateStatus}
                      onDelete={remove}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-[var(--pjus-hairline)] p-4 text-center">
                      <p className="text-[11px] text-brand-ink-3">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewLeadModal onClose={() => setShowModal(false)} onCreate={create} />}
    </div>
  );
}
