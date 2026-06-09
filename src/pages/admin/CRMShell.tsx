import { lazy, Suspense } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { cn } from "@/lib/utils";

const CRMUsers = lazy(() => import("./CRMUsers"));
const CRMLeads = lazy(() => import("./CRMLeads"));
const CRMOrgs  = lazy(() => import("./CRMOrgs"));

const TABS = [
  { path: "users",  label: "Usuários",       icon: "group" },
  { path: "leads",  label: "Leads",          icon: "person_add" },
  { path: "orgs",   label: "Organizações",   icon: "business" },
];

function TabFallback() {
  return (
    <div className="grid place-items-center min-h-[200px] text-brand-ink-3 text-sm gap-2">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
    </div>
  );
}

export default function CRMShell() {
  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Admin</Eyebrow>
        <h1>
          CRM — <span className="serif">Gestão de clientes</span>
        </h1>
        <p>
          Gerencie usuários da plataforma, leads comerciais e organizações B2B em um só lugar.
        </p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-[var(--pjus-hairline)]" aria-label="Seções do CRM">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-brand-ink-2 hover:text-brand-ink hover:border-brand-ink/20",
              )
            }
          >
            <MI name={tab.icon} className="text-[18px]" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Conteúdo da tab ativa */}
      <Suspense fallback={<TabFallback />}>
        <Routes>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<CRMUsers />} />
          <Route path="leads" element={<CRMLeads />} />
          <Route path="orgs"  element={<CRMOrgs />} />
        </Routes>
      </Suspense>
    </div>
  );
}
