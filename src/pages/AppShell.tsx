import { lazy, Suspense } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { Card, CardContent } from "@/components/ui/card";
import { useStudyStats, useWorkspace } from "@/hooks/useWorkspace";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";
import { cn } from "@/lib/utils";

const Dashboard = lazy(() => import("./Dashboard"));

function PageFallback() {
  return (
    <div className="grid place-items-center min-h-[60vh] text-brand-ink-2 text-sm">
      <span
        className="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin mr-2"
        aria-hidden
      />
      Carregando…
    </div>
  );
}

function ComingSoon({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <Eyebrow>{title}</Eyebrow>
        <h1 className="font-display text-brand-ink">{title}</h1>
      </header>
      <Card className="border-dashed">
        <CardContent className="p-10 grid place-items-center text-center gap-3">
          <MI name="construction" size={32} className="text-brand-gold" />
          <p className="font-display text-lg font-bold text-brand-ink">Em construção</p>
          <p className="text-sm text-brand-ink-2 max-w-md leading-relaxed">{hint}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuPage() {
  const navigate = useNavigate();
  const stats = useStudyStats();
  const { studies } = useWorkspace();

  return (
    <div className="space-y-8 animate-fade-up">
      <header>
        <Eyebrow>Painel</Eyebrow>
        <h1 className="font-display text-brand-ink">Sua mesa jurídica de estudo.</h1>
        <p className="mt-2 max-w-2xl text-brand-ink-2 leading-relaxed">
          Escolha uma ferramenta para construir tese, praticar prova ou revisar seus materiais salvos.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-4">
        <FeatureMainCard onClick={() => navigate("/app/study")} />
        <FeatureCard
          icon="chat_bubble"
          eyebrow="Chat"
          title="Preceptor Chat"
          description="Tire dúvidas sobre artigos, institutos, estratégia de prova e estrutura de peça."
          cta="Abrir chat"
          onClick={() => navigate("/app/chat")}
        />
      </div>

      <StatsStrip studies={stats.studies} exams={stats.exams} accuracy={stats.accuracy} />

      <div className="grid md:grid-cols-3 gap-3">
        <ToolCard
          icon="gavel"
          title="Simulados"
          description="Questões OAB, concursos e casos"
          onClick={() => navigate("/app/exam")}
        />
        <ToolCard
          icon="style"
          title="Flashcards"
          description="Repetição espaçada"
          onClick={() => navigate("/app/flashcards")}
        />
        <ToolCard
          icon="library_books"
          title="Biblioteca"
          description="Notas e estudos recentes"
          onClick={() => navigate("/app/library")}
        />
      </div>

      <RecentPanel latest={studies[0]} />
    </div>
  );
}

function FeatureMainCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card-interactive relative overflow-hidden text-left p-8 rounded-xl border border-brand-gold/30 text-white min-h-[260px]"
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--brand-primary-darker) / 0.96), rgb(var(--brand-primary) / 0.94)), radial-gradient(circle at top right, rgb(var(--brand-gold) / 0.22), transparent 18rem)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gold mb-3">Preceptoria</p>
      <h2 className="font-display text-white text-[1.75rem] leading-tight">Gerar estudo jurídico</h2>
      <p className="mt-3 max-w-md text-[14.5px] text-white/85 leading-relaxed">
        Transforme tema, aula ou caso em uma nota estruturada por fatos, lei, tese e prova.
      </p>
      <span className="inline-flex items-center gap-2 mt-6 text-brand-gold font-semibold text-sm">
        Começar agora <MI name="arrow_forward" size={16} />
      </span>
    </button>
  );
}

function FeatureCard({
  icon,
  eyebrow,
  title,
  description,
  cta,
  onClick,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-interactive relative overflow-hidden text-left p-7 rounded-xl border border-[var(--pjus-hairline)] bg-white min-h-[260px]"
    >
      <MI name={icon} size={28} className="text-brand-gold mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-primary mb-1">{eyebrow}</p>
      <h2 className="font-display text-brand-ink text-[1.4rem] leading-tight">{title}</h2>
      <p className="mt-3 text-[14px] text-brand-ink-2 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1.5 mt-5 text-brand-primary-dark font-semibold text-sm">
        {cta} <MI name="arrow_forward" size={14} />
      </span>
    </button>
  );
}

function StatsStrip({ studies, exams, accuracy }: { studies: number; exams: number; accuracy: number }) {
  return (
    <div className="pjus-kpi" style={{ ["--kpi-cols" as any]: "3" }}>
      <div className="pjus-kpi__item">
        <div className="pjus-kpi__lbl">Estudos salvos</div>
        <div className="pjus-kpi__val">{studies}</div>
      </div>
      <div className="pjus-kpi__item">
        <div className="pjus-kpi__lbl">Simulados feitos</div>
        <div className="pjus-kpi__val">{exams}</div>
      </div>
      <div className="pjus-kpi__item">
        <div className="pjus-kpi__lbl">Aproveitamento</div>
        <div className="pjus-kpi__val">
          {accuracy}
          <small>%</small>
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-interactive group text-left p-5 rounded-xl border border-[var(--pjus-hairline)] bg-white min-h-[120px]"
    >
      <div className="flex items-start justify-between mb-3">
        <MI name={icon} size={24} className="text-brand-primary group-hover:text-brand-gold transition-colors" />
        <MI name="arrow_outward" size={16} className="text-brand-ink-2/40" />
      </div>
      <p className="font-display text-brand-ink text-base font-bold leading-tight">{title}</p>
      <p className="mt-1 text-[13px] text-brand-ink-2 leading-snug">{description}</p>
    </button>
  );
}

function RecentPanel({ latest }: { latest: ReturnType<typeof useWorkspace>["studies"][number] | undefined }) {
  return (
    <section className="grid lg:grid-cols-[0.6fr_1fr] gap-5 p-6 rounded-xl border border-[var(--pjus-hairline)] bg-white">
      <div>
        <h2 className="font-display text-brand-ink text-xl">Arquivo jurídico recente</h2>
        <p className="mt-1 text-sm text-brand-ink-2 leading-relaxed">
          Seus estudos aparecem aqui depois de gerar conteúdo.
        </p>
      </div>
      <div
        className={cn(
          "grid place-content-center gap-1 min-h-[120px] p-4 rounded-xl text-center",
          latest
            ? "border border-[var(--pjus-hairline)] bg-[var(--pjus-surface-2)]"
            : "border border-dashed border-brand-gold/30 bg-[var(--pjus-surface-2)]",
        )}
      >
        {latest ? (
          <>
            <Link
              to={`/app/library?open=${latest.id}`}
              className="font-display text-brand-ink text-base hover:underline"
            >
              {latest.topic}
            </Link>
            <span className="text-[12px] text-brand-ink-2">
              {latest.modeLabel} salvo em {latest.date}
            </span>
          </>
        ) : (
          <>
            <strong className="font-display text-brand-ink">Seu arquivo está pronto.</strong>
            <span className="text-[12px] text-brand-ink-2">Gere um estudo para salvar automaticamente.</span>
          </>
        )}
      </div>
    </section>
  );
}

function ChatPage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <header>
        <Eyebrow>Preceptor Chat</Eyebrow>
        <h1 className="font-display text-brand-ink">Pergunte sobre o tema.</h1>
      </header>
      <PreceptorChatPanel variant="full" />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route index element={<MenuPage />} />
          <Route path="study" element={<Dashboard />} />
          <Route
            path="exam"
            element={
              <ComingSoon
                title="Simulados"
                hint="Onda 3: simulado interativo com Tabs + Progress, mantendo o parser do legacy."
              />
            }
          />
          <Route
            path="flashcards"
            element={
              <ComingSoon
                title="Flashcards"
                hint="Onda 3: deck com flip, exportação PDF e SM-2 (opcional)."
              />
            }
          />
          <Route
            path="library"
            element={
              <ComingSoon
                title="Biblioteca"
                hint="Onda 4: busca, filtros e ações de renomear/favoritar/apagar."
              />
            }
          />
          <Route path="chat" element={<ChatPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
