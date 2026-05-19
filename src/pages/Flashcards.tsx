import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { callAI } from "@/lib/api";
import { parseFlashcards, type Flashcard } from "@/lib/flashcard-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyLoader } from "@/components/study/StudyLoader";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import { InlineText } from "@/components/study/InlineText";
import { cn } from "@/lib/utils";

type State =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "deck"; topic: string; cards: Flashcard[]; index: number; flipped: boolean }
  | { kind: "error"; message: string };

export default function Flashcards() {
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") || "");
  const [state, setState] = useState<State>({ kind: "form" });

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setState({ kind: "loading" });
    try {
      const text = await callAI({ mode: "flashcards", topic: topic.trim() });
      const cards = parseFlashcards(text);
      if (!cards.length) {
        setState({
          kind: "error",
          message: "A IA não retornou flashcards válidos. Tente um tema mais específico.",
        });
        return;
      }
      setState({ kind: "deck", topic: topic.trim(), cards, index: 0, flipped: false });
    } catch (error: any) {
      setState({ kind: "error", message: error?.message || "Erro ao gerar flashcards." });
    }
  };

  const flip = () =>
    setState((s) => (s.kind === "deck" ? { ...s, flipped: !s.flipped } : s));

  const move = (delta: number) =>
    setState((s) => {
      if (s.kind !== "deck") return s;
      const index = Math.min(Math.max(s.index + delta, 0), s.cards.length - 1);
      return { ...s, index, flipped: false };
    });

  const reset = () => setState({ kind: "form" });

  return (
    <div className="space-y-5 animate-fade-up">
      <header>
        <Eyebrow>Flashcards</Eyebrow>
        <h1 className="font-display text-brand-ink">Revise por repetição.</h1>
        <p className="mt-2 max-w-2xl text-brand-ink-2 leading-relaxed">
          Cartões objetivos com pergunta e resposta fundamentada. Clique para virar.
        </p>
      </header>

      {state.kind === "form" && (
        <form
          onSubmit={generate}
          className="grid gap-4 p-6 rounded-2xl border border-[var(--pjus-hairline)] bg-white sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="fc-topic">Tema</Label>
            <Input
              id="fc-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Responsabilidade civil objetiva"
              maxLength={500}
            />
          </div>
          <Button type="submit" size="lg" disabled={!topic.trim()} className="btn-shimmer">
            <MI name="auto_awesome" size={18} />
            Gerar flashcards
          </Button>
        </form>
      )}

      {state.kind === "loading" && <StudyLoader kind="flashcards" />}

      {state.kind === "error" && <StudyErrorState message={state.message} onRetry={reset} />}

      {state.kind === "deck" && (
        <Deck state={state} onFlip={flip} onMove={move} onReset={reset} />
      )}
    </div>
  );
}

function Deck({
  state,
  onFlip,
  onMove,
  onReset,
}: {
  state: Extract<State, { kind: "deck" }>;
  onFlip: () => void;
  onMove: (delta: number) => void;
  onReset: () => void;
}) {
  const { cards, index, flipped } = state;
  const card = cards[index];
  const total = cards.length;
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gold">
            Baralho jurídico
          </p>
          <h2 className="font-display text-brand-ink text-lg truncate">{state.topic}</h2>
        </div>
        <span className="text-[12px] font-semibold text-brand-ink-2 shrink-0">
          {index + 1}/{total}
        </span>
      </div>

      <Progress value={progress} />

      <button
        type="button"
        onClick={onFlip}
        className={cn(
          "w-full min-h-[260px] p-8 rounded-2xl border text-center grid place-items-center gap-3 transition-colors",
          flipped
            ? "border-brand-gold/40 bg-brand-gold/[0.06]"
            : "border-[var(--pjus-hairline)] bg-white hover:border-brand-gold/40",
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-ink-2">
          {flipped ? "Verso" : "Frente"}
        </span>
        <strong className="font-display text-brand-ink text-xl leading-relaxed max-w-2xl">
          <InlineText text={flipped ? card.back : card.front} />
        </strong>
        <span className="text-[12px] text-brand-ink-2">
          {flipped ? "Clique para voltar à pergunta" : "Clique para revelar a resposta"}
        </span>
      </button>

      <div className="grid grid-cols-[auto_1fr_auto] gap-2">
        <Button variant="outline" size="sm" onClick={() => onMove(-1)} disabled={index === 0}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={onFlip}>
          <MI name="autorenew" size={16} />
          {flipped ? "Ver frente" : "Virar card"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
        >
          Próximo
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <MI name="refresh" size={16} />
          Novo baralho
        </Button>
      </div>
    </div>
  );
}
