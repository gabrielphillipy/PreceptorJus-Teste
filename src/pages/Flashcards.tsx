import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { callAI } from "@/lib/api";
import { parseFlashcards, type Flashcard } from "@/lib/flashcard-parser";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { InlineText } from "@/components/study/InlineText";
import { StudyErrorState } from "@/components/study/StudyErrorState";

const SM2_OPTIONS = [
  { q: 0, label: "Errei", due: "1m" },
  { q: 1, label: "Difícil", due: "10m" },
  { q: 2, label: "Bom", due: "1d" },
  { q: 3, label: "Fácil", due: "4d" },
];

type Phase =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "deck"; topic: string; cards: Flashcard[] }
  | { kind: "error"; message: string };

export default function Flashcards() {
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") || "");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setPhase({ kind: "loading" });
    try {
      const text = await callAI({ mode: "flashcards", topic: topic.trim() });
      const cards = parseFlashcards(text);
      if (!cards.length) {
        setPhase({
          kind: "error",
          message: "A IA não retornou flashcards válidos. Tente um tema mais específico.",
        });
        return;
      }
      setPhase({ kind: "deck", topic: topic.trim(), cards });
    } catch (err: any) {
      setPhase({ kind: "error", message: err?.message || "Erro ao gerar flashcards." });
    }
  };

  const reset = () => setPhase({ kind: "form" });

  if (phase.kind === "loading") return <FlashcardsLoading />;
  if (phase.kind === "error") return <StudyErrorState message={phase.message} onRetry={reset} />;
  if (phase.kind === "deck") return <Deck topic={phase.topic} cards={phase.cards} onReset={reset} />;

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Flashcards</Eyebrow>
        <h1>
          Revisão diária por <span className="serif">matéria</span>.
        </h1>
        <p>
          Algoritmo de repetição espaçada (SM-2 visual). Digite um tema; o Preceptor compõe 6 cards
          objetivos com pergunta e resposta fundamentada.
        </p>
      </header>

      <form
        onSubmit={generate}
        className="exam-setup"
        style={{ gridTemplateColumns: "minmax(0,1fr) 320px" }}
      >
        <div className="exam-setup__form">
          <header className="exam-setup__head">
            <div className="row">
              <span className="exam-setup__num">DECK Nº PJUS/{new Date().getFullYear()}/0001</span>
              <span className="exam-setup__sep">║</span>
              <span>Compor baralho</span>
            </div>
            <h1 className="exam-setup__h">
              Novo <span className="serif">baralho</span> jurídico.
            </h1>
            <p className="exam-setup__sub">
              Cada card traz uma frente curta e um verso fundamentado, com destaque para artigos,
              súmulas e teses.
            </p>
          </header>

          <div className="exam-setup__body">
            <div className="fg">
              <span className="fg__label">
                <span className="num">I</span>
                Tema do baralho
              </span>
              <p className="fg__sub">
                Pode ser um instituto ("responsabilidade civil objetiva"), uma área ("CDC — vícios")
                ou um artigo ("Art. 927 CC").
              </p>
              <input
                className="field"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex.: Responsabilidade civil objetiva"
                maxLength={500}
                autoFocus
              />
            </div>
          </div>
        </div>

        <aside className="exam-summary">
          <header className="exam-summary__head">
            <span className="exam-summary__eyebrow">Resumo do baralho</span>
            <h3 className="exam-summary__h">Pré-visualização</h3>
          </header>
          <dl className="exam-summary__body">
            <div className="exam-summary__row big">
              <dt>Cards</dt>
              <dd>6</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Distribuição</dt>
              <dd style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                Conceito · Base legal · Jurisprudência · Pegadinha
              </dd>
            </div>
            <div className="exam-summary__row">
              <dt>Modo</dt>
              <dd>Flip · SM-2 visual</dd>
            </div>
            <div className="exam-summary__row">
              <dt>Estimativa</dt>
              <dd>~6 min</dd>
            </div>
          </dl>
          <footer className="exam-summary__foot">
            <p className="legal">
              <b>Material acadêmico.</b> Confira sempre fontes oficiais — legislação, jurisprudência
              e súmulas atualizadas.
            </p>
            <button
              type="submit"
              className="btn btn--default btn--lg btn--block btn-shimmer"
              disabled={!topic.trim()}
            >
              <MI name="auto_awesome" size={18} />
              Gerar flashcards
            </button>
          </footer>
        </aside>
      </form>
    </div>
  );
}

function FlashcardsLoading() {
  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Flashcards · gerando</Eyebrow>
        <h1>Compondo o baralho…</h1>
      </header>
      <div className="exam-loading">
        <div className="exam-loading__carimbo">
          <div className="carimbo" style={{ width: "100%", height: "100%", margin: 0 }}>
            <span className="carimbo__top">Preceptoria</span>
            <span className="carimbo__mid">Em curso</span>
            <span className="carimbo__bot">PJUS · {new Date().getFullYear()}</span>
          </div>
        </div>
        <h2>Compondo seu baralho…</h2>
        <p>
          O Preceptor está transformando o tema em perguntas e respostas objetivas, com fundamento
          jurídico em cada verso.
        </p>
      </div>
    </div>
  );
}

function Deck({ topic, cards, onReset }: { topic: string; cards: Flashcard[]; onReset: () => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<Record<number, number>>({}); // card index → 0..3
  const total = cards.length;
  const card = cards[idx];

  const reviewed = Object.keys(grades).length;
  const mastered = Object.values(grades).filter((g) => g >= 2).length;
  const accuracy = useMemo(() => (reviewed ? Math.round((mastered / reviewed) * 100) : 0), [reviewed, mastered]);

  const flip = () => setFlipped((f) => !f);
  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % total); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + total) % total); };
  const grade = (q: number) => {
    setGrades((g) => ({ ...g, [idx]: q }));
    setTimeout(() => {
      setFlipped(false);
      setIdx((i) => (i + 1) % total);
    }, 220);
  };

  // Keyboard shortcuts: Space = flip, ←/→ = nav, 1-4 = grade (after flip)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); flip(); }
      else if (e.code === "ArrowRight") next();
      else if (e.code === "ArrowLeft") prev();
      else if (flipped && ["1", "2", "3", "4"].includes(e.key)) grade(parseInt(e.key, 10) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, idx, total]);

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <div className="between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <Eyebrow>Flashcards</Eyebrow>
            <h1>
              Revisando <span className="serif">{topic}</span>.
            </h1>
            <p>
              Clique no card ou pressione <code>Espaço</code> para virar. Avalie com{" "}
              <code>1</code>–<code>4</code> ao revelar a resposta.
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onReset}>
            <MI name="refresh" size={14} />
            Novo baralho
          </button>
        </div>
      </header>

      <div className="deck-stats">
        <div>
          <div className="lbl">Deck</div>
          <div className="val" style={{ fontSize: 15, lineHeight: 1.3 }}>{topic}</div>
        </div>
        <div>
          <div className="lbl">Para hoje</div>
          <div className="val gold">{total - reviewed}</div>
        </div>
        <div>
          <div className="lbl">Revisados</div>
          <div className="val">{reviewed}</div>
        </div>
        <div>
          <div className="lbl">Dominados</div>
          <div className="val">
            {mastered}
            <span className="pct">/{reviewed || 0}</span>
          </div>
        </div>
      </div>

      <div className="flashstage">
        <div
          className={`flashcard ${flipped ? "flipped" : ""}`}
          onClick={flip}
          role="button"
          aria-label="Virar card"
          tabIndex={0}
        >
          <div className="flashcard__face">
            <span className="flashcard__eyebrow">Card {idx + 1} de {total}</span>
            <h2 className="flashcard__front-q">
              <InlineText text={card.front} />
            </h2>
            <span className="flashcard__hint">
              <MI name="touch_app" size={14} />
              Clique ou pressione Espaço para revelar
            </span>
          </div>
          <div className="flashcard__face back">
            <span className="flashcard__eyebrow">Card {idx + 1} · resposta</span>
            <p className="flashcard__back-a">
              <InlineText text={card.back} />
            </p>
            <span className="flashcard__cite">{topic}</span>
          </div>
        </div>
      </div>

      <div className="sm2" style={!flipped ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
        {SM2_OPTIONS.map((o) => (
          <button
            key={o.q}
            type="button"
            data-q={o.q}
            onClick={() => grade(o.q)}
          >
            <span>{o.label}</span>
            <span className="due">{flipped ? `próxima · ${o.due}` : "vire o card"}</span>
          </button>
        ))}
      </div>

      <div className="deck-controls">
        <button className="btn btn--outline btn--sm" onClick={prev}>
          <MI name="arrow_back" size={16} />
          Anterior
        </button>
        <div className="deck-controls__center">
          <span className="deck-pill">
            <MI name="style" size={14} />
            Card {idx + 1} de {total}
          </span>
          <span>· Aproveitamento: {accuracy}%</span>
        </div>
        <button className="btn btn--outline btn--sm" onClick={next}>
          Próximo
          <MI name="arrow_forward" size={16} />
        </button>
      </div>
    </div>
  );
}
