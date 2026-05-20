import { lazy, Suspense, useState, type FormEvent } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { useStudyStats, useWorkspace } from "@/hooks/useWorkspace";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

const Dashboard = lazy(() => import("./Dashboard"));
const Exam = lazy(() => import("./Exam"));
const Flashcards = lazy(() => import("./Flashcards"));
const Library = lazy(() => import("./Library"));

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

const PT_WEEKDAYS_LONG = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const PT_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatLongDate(d: Date) {
  return `${PT_WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${PT_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}
function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// Pauta/Semana são conteúdo editorial estático (não há plano de estudo persistido
// ainda) — espelham o handoff de design. KPIs, última minuta e navegação usam
// dados reais (useStudyStats / useWorkspace / react-router).
const PAUTA = [
  { time: "08:00", title: "Revisão Civil — Súmulas STJ", meta: "12 flashcards · 8 minutos", area: "civil", state: "done", tag: "Civil" },
  { time: "09:30", title: "Fechamento — Controle concentrado", meta: "ADI, ADC, ADPF · 18 min", area: "const", state: "done", tag: "Const." },
  { time: "10:45", title: "Simulado OAB — Bloco 1ª fase", meta: "10 questões · 40 minutos", area: "oab", state: "now", tag: "OAB" },
  { time: "14:00", title: "Estudo Penal — Insignificância", meta: "vetores do STF, doutrina", area: "penal", state: "next", tag: "Penal" },
  { time: "16:30", title: "Peça — Petição inicial cível", meta: "Art. 319, CPC · roteiro", area: "proc", state: "next", tag: "Proc." },
  { time: "19:00", title: "Conversa Preceptor — dúvidas livres", meta: "tira-teimas e fechamento", area: "civil", state: "next", tag: "Civil" },
];

const QUICK_PROMPTS = [
  { icon: "auto_awesome", text: "Responsabilidade civil objetiva", area: "Civil" },
  { icon: "auto_awesome", text: "Habeas corpus — cabimento", area: "Constitucional" },
  { icon: "auto_awesome", text: "Vício vs defeito do produto", area: "CDC" },
  { icon: "auto_awesome", text: "Justa causa — requisitos", area: "Trabalho" },
];

const ATALHOS = [
  { icon: "gavel", title: "Simulados", sub: "OAB e concursos", count: "Gerar", route: "exam", hot: true },
  { icon: "style", title: "Flashcards", sub: "Revisão por repetição", count: "Gerar", route: "flashcards", hot: true },
  { icon: "library_books", title: "Biblioteca", sub: "Notas, peças e súmulas", count: null, route: "library" },
  { icon: "chat_bubble", title: "Preceptor Chat", sub: "Tire dúvidas conjuntas", count: null, route: "chat" },
];

const SEMANA = [
  { lbl: "SEG", num: "10", bars: [1, 2, 1, 2, 0], minutes: 84, today: false, empty: false },
  { lbl: "TER", num: "11", bars: [1, 1, 2, 1, 1], minutes: 62, today: false, empty: false },
  { lbl: "QUA", num: "12", bars: [2, 2, 1, 2, 2], minutes: 96, today: false, empty: false },
  { lbl: "QUI", num: "13", bars: [0, 1, 0, 1, 0], minutes: 28, today: false, empty: false },
  { lbl: "SEX", num: "14", bars: [2, 2, 2, 1, 2], minutes: 112, today: true, empty: false },
  { lbl: "SÁB", num: "15", bars: [0, 0, 0, 0, 0], minutes: 0, today: false, empty: true },
  { lbl: "DOM", num: "16", bars: [0, 0, 0, 0, 0], minutes: 0, today: false, empty: true },
];

function MenuPage() {
  const navigate = useNavigate();
  const stats = useStudyStats();
  const { studies } = useWorkspace();
  const [quick, setQuick] = useState("");

  const now = new Date();
  const latest = studies[0];
  const pautaDone = PAUTA.filter((p) => p.state === "done").length;
  const protocolo = `PJUS/${now.getFullYear()}/${String(stats.studies + 1).padStart(4, "0")}`;

  const goStudy = (topic?: string) =>
    navigate(topic ? `/app/study?topic=${encodeURIComponent(topic)}` : "/app/study");

  const submitQuick = (e: FormEvent) => {
    e.preventDefault();
    goStudy(quick.trim() || undefined);
  };

  return (
    <div className="fade-up">
      <header>
        <div className="painel-masthead">
          <span className="painel-masthead__edition">PreceptorJus</span>
          <h1 className="painel-masthead__title">Pauta de hoje</h1>
          <span className="painel-masthead__rule" />
          <span className="painel-masthead__date">{formatLongDate(now)}</span>
          <span className="painel-masthead__weather">
            <span className="dot" />
            Sessão ativa
          </span>
        </div>

        <div className="painel-greet">
          <div>
            <h2 className="painel-greet__h1">
              {greeting(now)}, <span className="serif">Estudante</span>.
            </h2>
            <p className="painel-greet__sub">
              Comece pelo que estiver mais quente — o resto fica salvo na biblioteca. O Preceptor organiza
              fundamento, jurisprudência e pontos de prova como uma minuta de parecer.
            </p>
          </div>
          <div className="painel-greet__stamp">
            <span className="day-pill">
              <MI name="calendar_today" size={12} />
              Dia {now.getDate()}/{now.getMonth() + 1}
            </span>
            <span>
              Minuta protocolar <b>{protocolo}</b>
            </span>
          </div>
        </div>

        <div className="painel-hero">
          <button className="painel-hero__featured" onClick={() => goStudy()}>
            <span className="painel-hero__featured-eyebrow">Preceptoria · ferramenta principal</span>
            <h2>
              Gere uma <span className="serif">nota jurídica</span>
              <br />
              em segundos.
            </h2>
            <p>
              Defina tema, modo e seções. O Preceptor IA organiza fundamento, jurisprudência, tese e pontos
              de prova como uma minuta de parecer.
            </p>
            <div className="painel-hero__featured-row">
              <span className="btn btn--gold btn--lg">
                <MI name="auto_awesome" size={18} />
                Começar fechamento
              </span>
            </div>
            <span className="painel-hero__featured-corner" aria-hidden />
          </button>

          <aside className="painel-hero__quick">
            <span className="painel-hero__quick-h">Continuar de onde parou</span>
            <form className="painel-hero__quick-input" onSubmit={submitQuick}>
              <input
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                placeholder="Digite um tema rápido — ex.: Art. 927"
                aria-label="Tema rápido"
              />
              <button type="submit" aria-label="Gerar estudo">
                <MI name="arrow_upward" size={16} />
              </button>
            </form>
            <div className="painel-hero__quick-suggest">
              {QUICK_PROMPTS.map((p) => (
                <button key={p.text} onClick={() => goStudy(p.text)}>
                  <MI name={p.icon} />
                  <span>{p.text}</span>
                  <span className="area">{p.area}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </header>

      <section className="painel-cols" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="pauta">
            <header className="pauta__head">
              <h3 className="pauta__h">
                Pauta de hoje
                <span className="num">VI itens</span>
              </h3>
              <span className="pauta__progress">
                <b>{pautaDone}</b> de {PAUTA.length} concluídos
              </span>
            </header>
            <div className="timeline">
              {PAUTA.map((row, i) => (
                <div
                  key={i}
                  className={`t-row ${row.state === "now" ? "now" : ""} ${row.state === "done" ? "done" : ""}`}
                >
                  <span className="t-row__time">{row.time}</span>
                  <div className="t-row__what">
                    {row.title}
                    <small>{row.meta}</small>
                  </div>
                  <span className={`t-row__tag ${row.area}`}>{row.tag}</span>
                </div>
              ))}
            </div>
            <footer className="pauta__foot">
              <span>Encerramento previsto: 20:30 · 4h 12min de estudo</span>
            </footer>
          </div>

          {latest ? (
            <article className="minuta-feat" onClick={() => navigate(`/app/library?open=${latest.id}`)}>
              <header className="minuta-feat__head">
                <span className="minuta-feat__num">MINUTA Nº {protocolo}</span>
                <span className="minuta-feat__sep">║</span>
                <span className="minuta-feat__area">{latest.modeLabel || "Estudo jurídico"}</span>
                <span className="minuta-feat__time">{latest.date}</span>
              </header>
              <div className="minuta-feat__body">
                <h3 className="minuta-feat__topic">{latest.topic}</h3>
                <p className="minuta-feat__excerpt">{latest.excerpt || "Material salvo na biblioteca."}</p>
              </div>
              <footer className="minuta-feat__foot">
                <span>↳ Salvo automaticamente</span>
                <span className="minuta-feat__continue">Continuar leitura</span>
              </footer>
            </article>
          ) : (
            <article className="minuta-feat" onClick={() => goStudy()}>
              <header className="minuta-feat__head">
                <span className="minuta-feat__num">MINUTA Nº {protocolo}</span>
                <span className="minuta-feat__sep">║</span>
                <span className="minuta-feat__area">Arquivo vazio</span>
              </header>
              <div className="minuta-feat__body">
                <h3 className="minuta-feat__topic">Seu arquivo está pronto.</h3>
                <p className="minuta-feat__excerpt">
                  Gere um estudo e ele aparece aqui como sua última minuta, salvo automaticamente na
                  biblioteca.
                </p>
              </div>
              <footer className="minuta-feat__foot">
                <span>↳ Nenhuma minuta ainda</span>
                <span className="minuta-feat__continue">Gerar agora</span>
              </footer>
            </article>
          )}

          <div className="kpi-strip">
            <div>
              <span className="kpi-strip__lbl">Estudos salvos</span>
              <span className="kpi-strip__val">{stats.studies}</span>
              <div className="kpi-strip__bars" aria-hidden>
                <span /><span className="warm" /><span className="warm" /><span /><span className="hot" /><span className="warm" /><span className="hot" />
              </div>
              <span className="kpi-strip__delta">
                <MI name="bookmark" size={12} /> arquivo jurídico
              </span>
            </div>
            <div>
              <span className="kpi-strip__lbl">Simulados</span>
              <span className="kpi-strip__val">{stats.exams}</span>
              <div className="kpi-strip__bars" aria-hidden>
                <span /><span className="warm" /><span /><span className="warm" /><span className="hot" /><span /><span className="warm" />
              </div>
              <span className="kpi-strip__delta">
                <MI name="gavel" size={12} /> provas feitas
              </span>
            </div>
            <div>
              <span className="kpi-strip__lbl">Aproveitamento</span>
              <span className="kpi-strip__val gold">
                {stats.accuracy}
                <small>%</small>
              </span>
              <div className="kpi-strip__bars" aria-hidden>
                <span className="warm" /><span /><span className="hot" /><span className="warm" /><span className="hot" /><span className="hot" /><span className="hot" />
              </div>
              <span className="kpi-strip__delta">
                <MI name="fact_check" size={12} /> média nos simulados
              </span>
            </div>
            <div>
              <span className="kpi-strip__lbl">Ofensiva</span>
              <span className="kpi-strip__val">
                5<small>dias</small>
              </span>
              <div className="kpi-strip__bars" aria-hidden>
                <span className="hot" /><span className="hot" /><span className="hot" /><span className="hot" /><span className="hot" /><span /><span />
              </div>
              <span className="kpi-strip__delta flat">
                <MI name="local_fire_department" size={12} /> sequência de estudo
              </span>
            </div>
          </div>
        </div>

        <aside className="painel-aside">
          <div className="frase">
            <span className="frase__lbl">Tese da semana</span>
            <blockquote className="frase__body">
              Quem cria o <span className="serif" style={{ color: "rgb(var(--brand-gold))" }}>risco</span>{" "}
              responde pelo dano. A culpa, quando exigida, é desnecessária se a atividade for, em si, fonte
              permanente de perigo.
            </blockquote>
            <footer className="frase__cite">
              <span className="col-divider" />
              <span>
                Extraída de · <b>{latest ? latest.topic : "Resp. civil objetiva"}</b>
              </span>
            </footer>
          </div>

          <nav className="atalhos" aria-label="Atalhos">
            <header className="atalhos__h">Atalhos do gabinete</header>
            {ATALHOS.map((a) => (
              <button key={a.title} className="atalho" onClick={() => navigate(`/app/${a.route}`)}>
                <span className="atalho__icon">
                  <MI name={a.icon} />
                </span>
                <span className="atalho__main">
                  <span className="atalho__title">{a.title}</span>
                  <span className="atalho__sub">{a.sub}</span>
                </span>
                {a.count && <span className={`atalho__count ${a.hot ? "hot" : ""}`}>{a.count}</span>}
              </button>
            ))}
          </nav>
        </aside>
      </section>

      <section className="semana">
        <header className="semana__head">
          <h3 className="semana__h">
            Semana de estudo
            <span className="num">10 — 16 · março</span>
          </h3>
          <span className="semana__legend">
            <span>
              <i className="lite" /> &lt; 30 min
            </span>
            <span>
              <i className="warm" /> 30–60 min
            </span>
            <span>
              <i className="hot" /> &gt; 60 min
            </span>
          </span>
        </header>
        <div className="semana__grid">
          {SEMANA.map((day) => (
            <div key={day.num} className={`day ${day.today ? "today" : ""} ${day.empty ? "empty" : ""}`}>
              <span className="day__lbl">{day.lbl}</span>
              <span className="day__num">{day.num}</span>
              <div className="day__bars" aria-hidden>
                {day.bars.map((w, i) => (
                  <span
                    key={i}
                    className={w === 2 ? "hot" : w === 1 ? "warm" : ""}
                    style={{ height: `${[4, 9, 16][w] || 4}px` }}
                  />
                ))}
              </div>
              <span className="day__minutes">
                {day.empty ? "—" : (
                  <>
                    <b>{day.minutes}</b> min
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChatPage() {
  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Preceptor Chat</Eyebrow>
        <h1>Pergunte sobre o tema.</h1>
        <p>
          Use o chat como uma sessão de orientação rápida. Confira sempre fontes oficiais —
          legislação, jurisprudência e súmulas atualizadas.
        </p>
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
          <Route path="exam" element={<Exam />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="library" element={<Library />} />
          <Route path="chat" element={<ChatPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
