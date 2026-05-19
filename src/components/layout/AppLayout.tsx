import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { MI } from "@/components/brand/MaterialIcon";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";

interface AppLayoutProps {
  children: React.ReactNode;
  hideTopbarActions?: boolean;
}

interface NavItem {
  icon: string;
  label: string;
  path: string;
  matchPaths?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const sidebarGroups: NavGroup[] = [
  {
    label: "Estudo",
    items: [
      { icon: "dashboard", label: "Início", path: "/app" },
      { icon: "contract", label: "Estudo com IA", path: "/app/study" },
    ],
  },
  {
    label: "Prática",
    items: [
      { icon: "gavel", label: "Simulados", path: "/app/exam" },
      { icon: "style", label: "Flashcards", path: "/app/flashcards" },
    ],
  },
  {
    label: "Seus dados",
    items: [
      { icon: "library_books", label: "Biblioteca", path: "/app/library" },
      { icon: "chat_bubble", label: "Preceptor Chat", path: "/app/chat" },
    ],
  },
];

export function AppLayout({ children, hideTopbarActions = false }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (item: NavItem) => {
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    if (item.path === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(item.path);
  };

  const sidebarContent = (
    <>
      <div className="px-6 mb-8">
        <Link to="/app" className="group flex items-center gap-2.5">
          <LogoMark size={36} variant="dark" />
          <Wordmark variant="dark" />
        </Link>
        <div className="mt-4 h-px w-12 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
      </div>

      <nav className="flex-1 px-4 overflow-y-auto sidebar-scroll space-y-6" aria-label="Menu da plataforma">
        {sidebarGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="flex items-center gap-2 px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-gold/70">
                {group.label}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-brand-gold/20 to-transparent" aria-hidden />
            </div>

            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "group/navitem relative w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "text-white bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]",
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #E0C068 0%, #C9A84C 100%)" }}
                      aria-hidden
                    />
                  )}
                  <MI
                    name={item.icon}
                    fill={active}
                    className={cn("text-[22px] transition-colors", active ? "text-brand-gold" : "text-white/80 group-hover/navitem:text-white")}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/15 px-4">
        <div className="relative overflow-hidden mb-5 px-4 py-4 rounded-xl bg-gradient-to-br from-brand-gold/25 via-brand-gold/10 to-transparent border border-brand-gold/30">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-brand-gold/15 blur-2xl pointer-events-none" aria-hidden />
          <div className="relative">
            <p className="text-xs font-bold text-brand-gold mb-1">✦ Desbloqueie tudo</p>
            <p className="text-[11px] text-white/80 mb-3 leading-relaxed">
              Estudos jurídicos ilimitados, simulados OAB, biblioteca pessoal.
            </p>
            <Button
              variant="gold"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate("/pricing")}
            >
              Conhecer planos
            </Button>
          </div>
        </div>

        <Link
          to="/"
          className="w-full text-white/60 text-xs font-medium flex items-center gap-2 py-2 px-3 rounded-lg hover:text-white hover:bg-white/10 transition-all"
        >
          <MI name="arrow_back" className="text-[18px]" />
          <span>Voltar ao site</span>
        </Link>

        <div className="mt-4 pt-4 border-t border-white/5 px-2 flex items-center justify-between">
          <span className="text-[10px] text-white/25 tracking-wide">v2.0</span>
          <span className="text-[10px] text-white/25 tracking-wide flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-brand-gold/60" aria-hidden />
            feito para advocacia
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--pjus-canvas)] text-brand-ink antialiased">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 z-40 py-8 font-display"
        style={{ background: "var(--pjus-gradient-sidebar)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 bg-white/95 backdrop-blur border-b border-[var(--pjus-hairline)]">
        <Link to="/app" className="flex items-center gap-2">
          <LogoMark size={28} />
          <Wordmark />
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 -mr-2 text-brand-ink-2 hover:text-brand-primary touch-highlight"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-brand-primary-darker/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col py-8 animate-slide-in-left font-display"
            style={{ background: "var(--pjus-gradient-sidebar)" }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {!hideTopbarActions && (
          <header className="hidden lg:flex sticky top-0 z-20 items-center justify-end gap-2 px-8 h-16 bg-white/85 backdrop-blur border-b border-[var(--pjus-hairline)]">
            <FeedbackDialog />
            <Button variant="default" size="sm" onClick={() => navigate("/app/study")}>
              <MI name="auto_awesome" className="text-[18px]" />
              Novo fechamento
            </Button>
          </header>
        )}
        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
