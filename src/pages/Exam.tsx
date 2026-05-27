import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { callAI } from "@/lib/api";
import { parseExamPayload, type ExamQuestion } from "@/lib/exam-parser";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { SavedStudy } from "@/lib/workspace";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { InlineText } from "@/components/study/InlineText";

// ─── Setup data ──────────────────────────────────────────────────────────
type SourceKind = "library" | "free" | "oab";
const SOURCE_OPTIONS: { id: SourceKind; icon: string; title: string; sub: string }[] = [
  { id: "library", icon: "library_books", title: "Da sua biblioteca", sub: "Use um fechamento salvo como base — questões geradas a partir do conteúdo da minuta." },
  { id: "free",    icon: "edit_note",     title: "Tema livre",         sub: "Digite um tema ou área específica e deixe o Preceptor montar o simulado do zero." },
  { id: "oab",     icon: "gavel",         title: "Modelo OAB 1ª fase", sub: "Estilo prova oficial — questões distribuídas entre todas as disciplinas." },
];

// API clamps questionCount to 5–20 (api/_lib/legal.js). Use values within that range.
const Q_STEPS: { n: number; lbl: string; estimate: string }[] = [
  { n: 5,  lbl: "Curto",  estimate: "~10min" },
  { n: 10, lbl: "Médio",  estimate: "~22min" },
  { n: 15, lbl: "Longo",  estimate: "~35min" },
  { n: 20, lbl: "Prova",  estimate: "~45min" },
];

const AREAS = [
  { key: "civil", label: "Civil" },
  { key: "proc",  label: "Processo Civil" },
  { key: "const", label: "Constitucional" },
  { key: "penal", label: "Penal" },
  { key: "trab",  label: "Trabalho" },
  { key: "trib",  label: "Tributário" },
  { key: "adm",   label: "Administrativo" },
  { key: "cdc",   label: "Consumidor" },
  { key: "etica", label: "Ética OAB" },
  { key: "dh",    label: "Direitos Humanos" },
];

const DIFFICULTIES = [
  { key: "facil",   lbl: "Fácil",   bars: [true, false, false] },
  { key: "media",   lbl: "Média",   bars: [true, true, false] },
  { key: "dificil", lbl: "Difícil", bars: [true, true, true] },
  { key: "mista",   lbl: "Mista",   bars: [true, true, true] },
];
const BANCAS = ["OAB", "CESPE", "FGV", "FCC"] as const;
const FEEDBACK = [
  { key: "immediate", lbl: "Imediato" },
  { key: "end",       lbl: "Ao final" },
] as const;

const LOADER_STEPS = [
  { label: "Lendo a fonte",         icon: "menu_book" },
  { label: "Selecionando artigos",  icon: "balance" },
  { label: "Compondo questões",     icon: "auto_awesome" },
  { label: "Gerando gabarito",      icon: "fact_check" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
function toRoman(n: number): string {
  const map: [string, number][] = [["L",50],["XL",40],["X",10],["IX",9],["V",5],["IV",4],["I",1]];
  let s = "";
  for (const [r, v] of map) while (n >= v) { s += r; n -= v; }
  return s;
}

const areaLabel = (k: string) => AREAS.find((a) => a.key === k)?.label || k;
const diffLabel = (k: string) => DIFFICULTIES.find((d) => d.key === k)?.lbl || k;

interface Config {
  source: SourceKind;
  studyId: string;
  freeTopic: string;
  count: number;
  areas: string[];
  difficulty: string;
  banca: typeof BANCAS[number];
  feedback: typeof FEEDBACK[number]["key"];
}

interface AnswerState { picked: string; confirmed: boolean; }

type Phase =
  | { kind: "setup" }
  | { kind: "loading" }
  | { kind: "running"; questions: ExamQuestion[]; topic: string; difficulty: string }
  | { kind: "result"; questions: ExamQuestion[]; answers: Record<number, AnswerState>; topic: string; difficulty: string };

// ─────────────────────────────────────────────────────────────────────────
export default function Exam() {
  const [params] = useSearchParams();
  const initialTopic = params.get("topic") || "";
  const { studies, saveExam } = useWorkspace();

  const [config, setConfig] = useState<Config>({
    source: initialTopic ? "free" : studies.length ? "library" : "free",
    studyId: studies[0]?.id || "",
    freeTopic: initialTopic,
    count: 10,
    areas: [],
    difficulty: "media",
    banca: "OAB",
    feedback: "immediate",
  });
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [error, setError] = useState<string | null>(null);
  const [loadStep, setLoadStep] = useState(0);

  // Compose the API payload from the editorial config.
  const buildPayload = (): { topic: string; context?: string; difficulty: string; questionCount: number } => {
    const banca = config.banca;
    const diff = `${diffLabel(config.difficulty)}${banca ? ` · banca ${banca}` : ""}`;
    if (config.source === "library") {
      const s = studies.find((x) => x.id === config.studyId);
      return {
        topic: s?.topic || "Estudo jurídico salvo",
        context: s?.text,
        difficulty: diff,
        questionCount: config.count,
      };
    }
    if (config.source === "oab") {
      return {
        topic: "Exame de Ordem (OAB) — 1ª fase, distribuição entre todas as disciplinas",
        difficulty: diff,
        questionCount: config.count,
      };
    }
    // free
    const areas = config.areas.length ? ` — foco em: ${config.areas.map(areaLabel).join(", ")}` : "";
    return {
      topic: `${config.freeTopic.trim()}${areas}`,
      difficulty: diff,
      questionCount: config.count,
    };
  };

  const canGenerate =
    (config.source === "library" && !!config.studyId && studies.length > 0) ||
    (config.source === "free" && !!config.freeTopic.trim()) ||
    config.source === "oab";

  const generate = async () => {
    if (!canGenerate) return;
    setError(null);
    setPhase({ kind: "loading" });
    setLoadStep(0);
    // Cycle visual steps while the API call is in flight.
    const tick = setInterval(() => setLoadStep((s) => Math.min(s + 1, LOADER_STEPS.length - 1)), 1100);

    const payload = buildPayload();
    try {
      const text = await callAI({ mode: "exam", ...payload });
      const questions = parseExamPayload(text);
      clearInterval(tick);
      if (!questions.length) {
        const preview = text ? ` (resposta recebida: "${text.slice(0, 120)}…")` : " (resposta vazia)";
        setError(`A IA não retornou um simulado válido. Tente um tema mais específico ou gere novamente.${preview}`);
        setPhase({ kind: "setup" });
        return;
      }
      setPhase({ kind: "running", questions, topic: payload.topic, difficulty: payload.difficulty });
    } catch (err: any) {
      clearInterval(tick);
      setError(err?.message || "Erro ao gerar o simulado.");
      setPhase({ kind: "setup" });
    }
  };

  if (phase.kind === "loading") return <ExamLoading step={loadStep} />;
  if (phase.kind === "running") {
    return (
      <ExamRunning
        questions={phase.questions}
        topic={phase.topic}
        feedbackMode={config.feedback}
        onAbort={() => setPhase({ kind: "setup" })}
        onFinish={(answers) => {
          // Persist exam in workspace
          const correct = phase.questions.reduce(
            (acc, q, i) => acc + (answers[i]?.picked === q.correctLetter ? 1 : 0),
            0,
          );
          saveExam({
            id: `exam-${Date.now()}`,
            topic: phase.topic,
            difficulty: phase.difficulty,
            correct,
            total: phase.questions.length,
            date: new Date().toLocaleDateString("pt-BR"),
          });
          setPhase({
            kind: "result",
            questions: phase.questions,
            answers,
            topic: phase.topic,
            difficulty: phase.difficulty,
          });
        }}
      />
    );
  }
  if (phase.kind === "result") {
    return (
      <ExamResult
        questions={phase.questions}
        answers={phase.answers}
        topic={phase.topic}
        onRestart={() => setPhase({ kind: "setup" })}
      />
    );
  }

  return (
    <ExamSetup
      config={config}
      setConfig={setConfig}
      studies={studies}
      onGenerate={generate}
      canGenerate={canGenerate}
      error={error}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Setup phase
// ─────────────────────────────────────────────────────────────────────────
function ExamSetup({
  config,
  setConfig,
  studies,
  onGenerate,
  canGenerate,
  error,
}: {
  config: Config;
  setConfig: (updater: (c: Config) => Config) => void;
  studies: SavedStudy[];
  onGenerate: () => void;
  canGenerate: boolean;
  error: string | null;
}) {
  const setKey = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => ({ ...c, [k]: v }));
  const toggleArea = (a: string) =>
    setConfig((c) => ({ ...c, areas: c.areas.includes(a) ? c.areas.filter((x) => x !== a) : [...c.areas, a] }));

  const estimate = Q_STEPS.find((s) => s.n === config.count)?.estimate || "—";
  const sourceLabel =
    config.source === "library"
      ? studies.find((s) => s.id === config.studyId)?.topic || "Selecione uma minuta"
      : config.source === "free"
      ? config.freeTopic || "Tema livre"
      : "Modelo OAB · 1ª fase";

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Simulados</Eyebrow>
        <h1>Componha um simulado sob medida.</h1>
        <p>Escolha de onde vem o conteúdo, quantas questões e o estilo de banca. Tudo configurável.</p>
      </header>

      {error && (
        <div className="legal" role="alert">
          <strong>Não foi possível gerar agora</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="exam-setup">
        <div className="exam-setup__form">
          <header className="exam-setup__head">
            <div className="row">
              <span className="exam-setup__num">SIMULADO Nº PJUS/{new Date().getFullYear()}/0001</span>
              <span className="exam-setup__sep">║</span>
              <span>Configuração de banca</span>
            </div>
            <h1 className="exam-setup__h">
              Compor um novo <span className="serif">simulado</span>.
            </h1>
            <p className="exam-setup__sub">
              Escolha a fonte, defina extensão e dificuldade. O Preceptor gera questões com gabarito,
              justificativa e remissão ao artigo correspondente.
            </p>
          </header>

          <div className="exam-setup__body">
            {/* I — Source */}
            <div className="fg">
              <span className="fg__label">
                <span className="num">I</span>
                Fonte do simulado
              </span>
              <p className="fg__sub">De onde o Preceptor vai puxar o conteúdo das questões.</p>
              <div className="source-grid">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`source-card ${config.source === s.id ? "on" : ""}`}
                    onClick={() => setKey("source", s.id)}
                    disabled={s.id === "library" && studies.length === 0}
                  >
                    <span className="source-card__icon"><MI name={s.icon} /></span>
                    <span className="source-card__title">{s.title}</span>
                    <span className="source-card__sub">
                      {s.id === "library" && studies.length === 0
                        ? "Nenhum fechamento salvo ainda — gere um estudo primeiro."
                        : s.sub}
                    </span>
                  </button>
                ))}
              </div>

              {config.source === "library" && studies.length > 0 && (
                <div className="fech-list" style={{ marginTop: 10 }}>
                  {studies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`fech-row ${config.studyId === s.id ? "on" : ""}`}
                      onClick={() => setKey("studyId", s.id)}
                    >
                      <span className="fech-row__dot" aria-hidden />
                      <div className="fech-row__main">
                        <p className="fech-row__topic">{s.topic}</p>
                        <div className="fech-row__meta">
                          <b>{s.modeLabel || "Estudo jurídico"}</b>
                          <span>· salvo em {s.date}</span>
                        </div>
                      </div>
                      <span className="fech-row__count">{Math.round((s.text?.length || 0) / 1024)} KB</span>
                    </button>
                  ))}
                </div>
              )}

              {config.source === "free" && (
                <input
                  className="field"
                  style={{ marginTop: 10 }}
                  placeholder="Ex.: Responsabilidade objetiva do Estado em omissões específicas"
                  value={config.freeTopic}
                  onChange={(e) => setKey("freeTopic", e.target.value)}
                  maxLength={500}
                />
              )}

              {config.source === "oab" && (
                <div className="legal" style={{ marginTop: 10, padding: "12px 16px" }}>
                  <strong>Modelo OAB · 1ª fase</strong>
                  <p>
                    Distribuição entre todas as disciplinas (Civil, Penal, Processo, Constitucional,
                    Trabalho, Tributário, Ética e demais). Use a barra abaixo para definir extensão.
                  </p>
                </div>
              )}
            </div>

            {/* II — Number of questions */}
            <div className="fg">
              <span className="fg__label">
                <span className="num">II</span>
                Número de questões
                <span className="hint">duração estimada · {estimate}</span>
              </span>
              <div className="q-stepper">
                {Q_STEPS.map((s) => (
                  <button
                    key={s.n}
                    type="button"
                    className={`q-step ${config.count === s.n ? "on" : ""}`}
                    onClick={() => setKey("count", s.n)}
                  >
                    <span className="q-step__n">{s.n}</span>
                    <span className="q-step__lbl">{s.lbl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* III — Areas (only when not library-bound) */}
            {config.source !== "library" && (
              <div className="fg">
                <span className="fg__label">
                  <span className="num">III</span>
                  Áreas do Direito
                  <span className="hint">
                    {config.areas.length === 0
                      ? "todas"
                      : `${config.areas.length} selecionada${config.areas.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                <p className="fg__sub">Deixe vazio para distribuir entre todas as áreas.</p>
                <div className="area-chips">
                  {AREAS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={`area-chip ${config.areas.includes(a.key) ? "on" : ""}`}
                      onClick={() => toggleArea(a.key)}
                    >
                      {config.areas.includes(a.key) && <MI name="check" />}
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* IV — Difficulty + banca + feedback */}
            <div className="fg">
              <span className="fg__label">
                <span className="num">IV</span>
                Dificuldade e estilo
              </span>
              <div className="seg">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={config.difficulty === d.key ? "on" : ""}
                    onClick={() => setKey("difficulty", d.key)}
                  >
                    <span className="level" aria-hidden>
                      <i className={d.bars[0] ? "full" : ""} style={{ height: 4 }} />
                      <i className={d.bars[1] ? "full" : ""} style={{ height: 7 }} />
                      <i className={d.bars[2] ? "full" : ""} style={{ height: 10 }} />
                    </span>
                    <span>{d.lbl}</span>
                  </button>
                ))}
              </div>

              <div className="opt-grid" style={{ marginTop: 6 }}>
                <div className="opt-card">
                  <div className="opt-card__label">Banca / estilo</div>
                  <div className="seg">
                    {BANCAS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={config.banca === b ? "on" : ""}
                        onClick={() => setKey("banca", b)}
                      >
                        <span>{b}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="opt-card">
                  <div className="opt-card__label">Quando mostrar gabarito</div>
                  <div className="seg" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                    {FEEDBACK.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={config.feedback === f.key ? "on" : ""}
                        onClick={() => setKey("feedback", f.key)}
                      >
                        <span>{f.lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail — live summary */}
        <aside className="exam-summary">
          <header className="exam-summary__head">
            <span className="exam-summary__eyebrow">Resumo da banca</span>
            <h3 className="exam-summary__h">Pré-visualização</h3>
          </header>
          <dl className="exam-summary__body">
            <div className="exam-summary__row big">
              <dt>Questões</dt>
              <dd>{config.count}</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Fonte</dt>
              <dd style={{ fontSize: 12.5, lineHeight: 1.4 }}>{sourceLabel}</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Banca</dt>
              <dd>{config.banca}</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Dificuldade</dt>
              <dd>{diffLabel(config.difficulty)}</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Gabarito</dt>
              <dd>{config.feedback === "immediate" ? "Após cada questão" : "Ao final"}</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Áreas</dt>
              <dd>
                {config.source === "library" ? (
                  <span style={{ fontSize: 12.5, color: "var(--pjus-ink-3)", fontWeight: 500 }}>
                    Derivadas da minuta
                  </span>
                ) : config.areas.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--pjus-ink-3)", fontWeight: 500 }}>
                    Todas as áreas
                  </span>
                ) : (
                  <div className="chips">
                    {config.areas.map((a) => (
                      <span key={a} className="chip-mini">{areaLabel(a)}</span>
                    ))}
                  </div>
                )}
              </dd>
            </div>
            <div className="exam-summary__row">
              <dt>Estimativa</dt>
              <dd>{estimate}</dd>
            </div>
          </dl>
          <footer className="exam-summary__foot">
            <p className="legal">
              <b>Material acadêmico.</b> Confira sempre fontes oficiais — legislação, jurisprudência e
              súmulas atualizadas.
            </p>
            <button
              type="button"
              className="btn btn--default btn--lg btn--block btn-shimmer"
              onClick={onGenerate}
              disabled={!canGenerate}
            >
              <MI name="auto_awesome" size={18} />
              Gerar simulado
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Loading phase
// ─────────────────────────────────────────────────────────────────────────
function ExamLoading({ step }: { step: number }) {
  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Simulados · gerando</Eyebrow>
        <h1>Compondo a banca…</h1>
      </header>
      <div className="exam-loading">
        <div className="exam-loading__carimbo">
          <div className="carimbo" style={{ width: "100%", height: "100%", margin: 0 }}>
            <span className="carimbo__top">Preceptoria</span>
            <span className="carimbo__mid">Em curso</span>
            <span className="carimbo__bot">PJUS · {new Date().getFullYear()}</span>
          </div>
        </div>
        <h2>Compondo seu simulado…</h2>
        <p>O Preceptor está organizando questões com gabarito, fundamento legal e remissão jurisprudencial.</p>
        <ul className="exam-loading__steps">
          {LOADER_STEPS.map((s, i) => (
            <li key={i} className={i < step ? "done" : i === step ? "now" : ""}>
              <MI name={i < step ? "check_circle" : i === step ? "progress_activity" : s.icon} size={16} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Running phase
// ─────────────────────────────────────────────────────────────────────────
function ExamRunning({
  questions,
  topic,
  feedbackMode,
  onAbort,
  onFinish,
}: {
  questions: ExamQuestion[];
  topic: string;
  feedbackMode: "immediate" | "end";
  onAbort: () => void;
  onFinish: (answers: Record<number, AnswerState>) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const total = questions.length;
  const q = questions[idx];
  const showFeedback = feedbackMode === "immediate";
  const state = answers[idx];
  const picked = state?.picked;
  const confirmed = !!state?.confirmed;
  const isCorrect = confirmed && picked === q.correctLetter;
  const answeredCount = Object.values(answers).filter((a) => a.confirmed).length;
  const correctCount = Object.entries(answers).filter(
    ([i, a]) => a.confirmed && a.picked === questions[Number(i)].correctLetter,
  ).length;
  const isLast = idx === total - 1;
  const canAdvance = showFeedback ? confirmed : !!picked;

  const pick = (letter: string) => {
    if (showFeedback && confirmed) return;
    setAnswers((a) => ({ ...a, [idx]: { picked: letter, confirmed: showFeedback ? false : true } }));
  };
  const confirm = () => {
    if (!picked) return;
    setAnswers((a) => ({ ...a, [idx]: { picked, confirmed: true } }));
  };
  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  const finalize = () => {
    // Mark all picked answers as confirmed for scoring
    const all: Record<number, AnswerState> = {};
    Object.entries(answers).forEach(([k, v]) => { all[Number(k)] = { ...v, confirmed: true }; });
    onFinish(all);
  };

  const selectedOpt = q.options.find((o) => o.letter === picked);

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <div className="between">
          <div>
            <Eyebrow>Simulado em curso</Eyebrow>
            <h1>{topic}</h1>
          </div>
          <button className="exam-abort" onClick={onAbort}>
            <MI name="close" size={14} />
            Encerrar simulado
          </button>
        </div>
      </header>

      <div className="exam-progress">
        <div className="exam-progress__bar">
          <div className="exam-progress__fill" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <span className="exam-progress__txt">
          {answeredCount}/{total} respondidas
          {showFeedback && answeredCount > 0 && (
            <> · {correctCount} acertos · {Math.round((correctCount / answeredCount) * 100)}%</>
          )}
        </span>
      </div>

      <div className="exam-grid">
        <aside className="q-nav">
          <h3 className="q-nav__title">Navegação</h3>
          <p className="q-nav__sub">Clique para pular · sinalize p/ revisão</p>
          <div className="q-nav__grid">
            {questions.map((qq, i) => {
              const a = answers[i];
              const cls = [
                "q-cell",
                i === idx && "current",
                showFeedback && a?.confirmed && a.picked === qq.correctLetter && i !== idx && "correct",
                showFeedback && a?.confirmed && a.picked !== qq.correctLetter && i !== idx && "wrong",
                !showFeedback && a?.picked && i !== idx && "current",
                flagged[i] && "flagged",
              ].filter(Boolean).join(" ");
              return <button key={i} className={cls} onClick={() => setIdx(i)}>{i + 1}</button>;
            })}
          </div>
          <div className="q-nav__legend">
            <span><i style={{ background: "#1B2A41", borderColor: "#1B2A41" }} /> Atual / respondida</span>
            {showFeedback && <span><i style={{ background: "#EAF6EE", borderColor: "rgba(43,75,67,0.35)" }} /> Acertou</span>}
            {showFeedback && <span><i style={{ background: "#FDEEEC", borderColor: "rgba(181,87,78,0.35)" }} /> Errou</span>}
            <span><i style={{ boxShadow: "inset 0 -3px 0 #C9A84C" }} /> Sinalizada</span>
          </div>
        </aside>

        <article className="question">
          <div className="question__head">
            <div style={{ flex: 1 }}>
              <span className="question__num">
                <span className="roman">{toRoman(idx + 1)}</span>
                Questão {idx + 1} de {total}
              </span>
              <p className="question__stem"><InlineText text={q.statement} /></p>
            </div>
            <button
              className={`question__flag ${flagged[idx] ? "on" : ""}`}
              onClick={() => setFlagged((f) => ({ ...f, [idx]: !f[idx] }))}
              aria-label="Sinalizar questão"
            >
              <MI name="flag" size={22} />
            </button>
          </div>

          <div className="alts">
            {q.options.map((opt) => {
              let cls = "alt";
              if (showFeedback) {
                if (!confirmed && picked === opt.letter) cls += " selected";
                if (confirmed && opt.letter === q.correctLetter) cls += " correct";
                if (confirmed && picked === opt.letter && opt.letter !== q.correctLetter) cls += " incorrect";
              } else if (picked === opt.letter) {
                cls += " selected";
              }
              return (
                <button
                  key={opt.letter}
                  className={cls}
                  onClick={() => pick(opt.letter)}
                  disabled={showFeedback && confirmed}
                  type="button"
                >
                  <span className="alt__letter">{opt.letter}</span>
                  <span><InlineText text={opt.text} /></span>
                </button>
              );
            })}
          </div>

          {showFeedback && confirmed && (
            <div className="q-explain">
              <div className={`q-explain__lead ${isCorrect ? "right" : "wrong"}`}>
                <MI name={isCorrect ? "check_circle" : "cancel"} size={16} />
                {isCorrect
                  ? `Resposta correta · alternativa ${picked}`
                  : `Resposta incorreta · gabarito: alternativa ${q.correctLetter}`}
              </div>
              <p><InlineText text={selectedOpt?.justification || q.comment || "Sem justificativa disponível."} /></p>
            </div>
          )}

          <div className="q-actions">
            <button className="btn btn--ghost btn--sm" onClick={prev} disabled={idx === 0} type="button">
              <MI name="arrow_back" size={16} />
              Anterior
            </button>
            <div className="q-actions__spacer" />
            {showFeedback && !confirmed ? (
              <button className="btn btn--default btn--sm" onClick={confirm} disabled={!picked} type="button">
                Confirmar resposta
                <MI name="arrow_forward" size={16} />
              </button>
            ) : (
              <button
                className="btn btn--default btn--sm"
                onClick={isLast ? finalize : next}
                disabled={!canAdvance}
                type="button"
              >
                {isLast ? (
                  <>Concluir simulado <MI name="check" size={16} /></>
                ) : (
                  <>Próxima <MI name="arrow_forward" size={16} /></>
                )}
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Result phase
// ─────────────────────────────────────────────────────────────────────────
function ExamResult({
  questions,
  answers,
  topic,
  onRestart,
}: {
  questions: ExamQuestion[];
  answers: Record<number, AnswerState>;
  topic: string;
  onRestart: () => void;
}) {
  const total = questions.length;
  const correct = useMemo(
    () => questions.reduce((acc, q, i) => acc + (answers[i]?.picked === q.correctLetter ? 1 : 0), 0),
    [questions, answers],
  );
  const wrong = total - correct;
  const pct = Math.round((correct / total) * 100);
  const minutes = Math.round(total * 2.2);

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Resultado</Eyebrow>
        <h1>Simulado encerrado.</h1>
      </header>

      <div className="exam-result">
        <div className="exam-result__head">
          <div>
            <Eyebrow>Banca · {topic}</Eyebrow>
            <h1>
              Aproveitamento de <span className="serif">{pct}%</span>.
            </h1>
            <p>
              {pct >= 70
                ? "Resultado dentro da nota de corte do simulado. Continue com a rotina."
                : pct >= 50
                ? "Você está progredindo. Revise as questões erradas e refaça em 48h."
                : "O conteúdo ainda está em construção. Volte ao fechamento de referência antes de novo simulado."}
            </p>
          </div>
          <div className="exam-result__score">
            <span className="exam-result__score-num">{correct}</span>
            <span className="exam-result__score-of">de {total} acertos</span>
          </div>
        </div>

        <div className="exam-result__stats">
          <div>
            <div className="lbl">Aproveitamento</div>
            <div className="val gold">{pct}<span style={{ fontSize: 16, fontFamily: "var(--font-body)", fontStyle: "normal", color: "var(--pjus-ink-3)", fontWeight: 600 }}>%</span></div>
          </div>
          <div>
            <div className="lbl">Acertos</div>
            <div className="val">{correct}</div>
          </div>
          <div>
            <div className="lbl">Erros</div>
            <div className="val danger">{wrong}</div>
          </div>
          <div>
            <div className="lbl">Tempo estimado</div>
            <div className="val">{minutes}<span style={{ fontSize: 16, fontFamily: "var(--font-body)", fontStyle: "normal", color: "var(--pjus-ink-3)", fontWeight: 600, marginLeft: 4 }}>min</span></div>
          </div>
        </div>

        <div className="exam-result__breakdown">
          <h3>Detalhamento por questão</h3>
          <div className="exam-result__list">
            {questions.map((q, i) => {
              const a = answers[i];
              const right = a && a.picked === q.correctLetter;
              return (
                <div key={i} className={`er-row ${right ? "right" : "wrong"}`}>
                  <span className="er-row__n">{toRoman(i + 1)}</span>
                  <span className="er-row__stem">{q.statement}</span>
                  <span className="er-row__area">Gabarito: {q.correctLetter}</span>
                  <span className={`er-row__verdict ${right ? "right" : "wrong"}`}>
                    <MI name={right ? "check_circle" : "cancel"} size={14} />
                    {right ? "Certo" : "Errou"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="exam-result__actions">
          <div className="spacer" />
          <button className="btn btn--default" onClick={onRestart} type="button">
            <MI name="auto_awesome" size={16} />
            Compor novo simulado
          </button>
        </div>
      </div>
    </div>
  );
}
