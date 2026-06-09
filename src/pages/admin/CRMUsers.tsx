import { useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";
import { useCRMUsers } from "@/hooks/useCRM";
import type { UserRole } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  member: "Membro",
  manager: "Gestor",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  member: "bg-brand-ink/8 text-brand-ink-2",
  manager: "bg-blue-50 text-blue-700",
  admin: "bg-amber-50 text-amber-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CRMUsers() {
  const { users, loading, error, updateRole } = useCRMUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.team ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleRoleChange(id: string, role: UserRole) {
    setUpdatingId(id);
    await updateRole(id, role);
    setUpdatingId(null);
  }

  return (
    <div className="stack">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MI name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3 text-[18px]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou equipe…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--pjus-hairline)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="flex gap-1">
          {(["all", "member", "manager", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                roleFilter === r
                  ? "bg-brand-primary text-white"
                  : "bg-white border border-[var(--pjus-hairline)] text-brand-ink-2 hover:border-brand-primary/40",
              )}
            >
              {r === "all" ? "Todos" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-brand-ink-3 font-medium">
          {filtered.length} {filtered.length === 1 ? "usuário" : "usuários"}
        </span>
      </div>

      {/* Tabela */}
      {error ? (
        <div className="card p-6 text-sm text-red-600 flex items-center gap-2">
          <MI name="error" className="text-[20px]" />
          {error}
        </div>
      ) : loading ? (
        <div className="card p-8 grid place-items-center text-brand-ink-3 text-sm gap-2">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
          Carregando usuários…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 grid place-items-center text-center gap-2">
          <MI name="group_off" className="text-[32px] text-brand-ink-3" />
          <p className="text-sm text-brand-ink-2">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--pjus-hairline)] bg-[var(--pjus-canvas)]">
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Equipe
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide hidden md:table-cell">
                  Cadastro
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-ink-2 text-xs uppercase tracking-wide">
                  Perfil
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pjus-hairline)]">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--pjus-canvas)]/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-dark grid place-items-center text-white text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-brand-ink">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-ink-2 hidden sm:table-cell">
                    {u.team || <span className="text-brand-ink-3">—</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-ink-3 hidden md:table-cell">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {updatingId === u.id ? (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30",
                          ROLE_COLORS[u.role],
                        )}
                      >
                        {(["member", "manager", "admin"] as UserRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
