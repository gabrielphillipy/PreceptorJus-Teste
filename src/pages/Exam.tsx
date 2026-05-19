import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { callAI } from "@/lib/api";
import { parseExamPayload, type ExamQuestion } from "@/lib/exam-parser";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyLoader } from "@/components/study/StudyLoader";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import { InlineText } from "@/components/study/InlineText";
import { cn } from "@/lib/utils";

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTIES = [
  { value: "OAB", label: "OAB" },
  { value: "basico", label: "Básico" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "concurso", label: "Concurso" },
];

type State =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "running"; topic: string; difficulty: string; questions: ExamQuestion[]; index: number; answers: string[] }
  | { kind: "result"; topic: string; difficulty: string; questions: ExamQuestion[]; answers: string[] }
  | { kind: "error"; message: string };

export default function Exam() {
  const [params] = useSearchParams();
  const { saveExam } = useWorkspace();

  const [topic, setTopic] = useState(params.get("topic") || "");
  const [questionCount, setQuestionCount] = useState("5");
  const [difficulty, setDifficulty] = useState("OAB");
  const [state, setState] = useState<State>({ kind: "form" });

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setState({ kind: "loading" });
    try {
      const text = await callAI({
        mode: "exam",
        topic: topic.trim(),
        questionCount: Number(questionCount),
        difficulty,
      });
      const questions = parseExamPayload(text);
      if (!questions.length) {
        setState({
          kind: "error",
          message: "A IA não retornou um simulado válido. Tente um tema mais específico ou gere novamente.",
        });
        return;
      }
      setState({
        kind: "running",
        topic: topic.trim(),
        difficulty,
        questions,
        index: 0,
        answers: Array.from({ length: questions.length }, () => ""),
      });
    } catch (error: any) {
      setState({ kind: "error", message: error?.message || "Erro ao gerar o simulado." });
    }
  };

  const answer = (letter: string) => {
    setState((s) => {
      if (s.kind !== "running" || s.answers[s.index]) return s;
      const answers = [...s.answers];
      answers[s.index] = letter;
      return { ...s, answers };
    });
  };

  const move = (delta: number) => {
    setState((s) => {
      if (s.kind !== "running") return s;
      const next = Math.min(Math.max(s.index + delta, 0), s.questions.length - 1);
      return { ...s, index: next };
    });
  };

  const finish = () => {
    setState((s) => {
      if (s.kind !== "running") return s;
      const correct = s.questions.reduce(
        (acc, q, i) => acc + (s.answers[i] === q.correctLetter ? 1 : 0),
        0,
      );
      saveExam({
        id: `exam-${Date.now()}`,
        topic: s.topic,
        difficulty: s.difficulty,
        correct,
        total: s.questions.length,
        date: new Date().toLocaleDateString("pt-BR"),
      });
      return {
        kind: "result",
        topic: s.topic,
        difficulty: s.difficulty,
        questions: s.questions,
        answers: s.answers,
      };
    });
  };

  const reset = () => setState({ kind: "form" });

  return (
    <div className="space-y-5 animate-fade-up">
      <header>
        <Eyebrow>Simulados</Eyebrow>
        <h1 className="font-display text-brand-ink">Treine como a banca cobra.</h1>
        <p className="mt-2 max-w-2xl text-brand-ink-2 leading-relaxed">
          Gere um simulado com gabarito comentado. Cada alternativa vem com justificativa.
        </p>
      </header>

      {state.kind === "form" && (
        <form
          onSubmit={generate}
          className="grid gap-4 p-6 rounded-2xl border border-[var(--pjus-hairline)] bg-white sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="exam-topic">Tema</Label>
            <Input
              id="exam-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Controle concentrado de constitucionalidade"
              maxLength={500}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="exam-count">Questões</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger id="exam-count" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNTS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questões
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="exam-diff">Nível</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="exam-diff" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="lg" disabled={!topic.trim()} className="btn-shimmer">
            <MI name="auto_awesome" size={18} />
            Gerar simulado
          </Button>
        </form>
      )}

      {state.kind === "loading" && <StudyLoader kind="exam" />}

      {state.kind === "error" && (
        <StudyErrorState message={state.message} onRetry={reset} />
      )}

      {state.kind === "running" && (
        <ExamRunner
          state={state}
          onAnswer={answer}
          onMove={move}
          onFinish={finish}
        />
      )}

      {state.kind === "result" && (
        <ExamResult state={state} onRestart={reset} />
      )}
    </div>
  );
}

function ExamRunner({
  state,
  onAnswer,
  onMove,
  onFinish,
}: {
  state: Extract<State, { kind: "running" }>;
  onAnswer: (letter: string) => void;
  onMove: (delta: number) => void;
  onFinish: () => void;
}) {
  const q = state.questions[state.index];
  const total = state.questions.length;
  const selected = state.answers[state.index];
  const isLast = state.index === total - 1;
  const progress = Math.round(((state.index + 1) / total) * 100);
  const selectedOpt = q.options.find((o) => o.letter === selected);
  const isCorrect = selected === q.correctLetter;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12px] font-semibold text-brand-ink-2">
          <span>
            Questão {state.index + 1} de {total}
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="p-6 rounded-2xl border border-[var(--pjus-hairline)] bg-white space-y-4">
        <p className="font-display text-brand-ink text-lg leading-relaxed">
          <InlineText text={q.statement} />
        </p>

        <div className="grid gap-2">
          {q.options.map((opt) => {
            const optIsCorrect = opt.letter === q.correctLetter;
            const optIsSelected = selected === opt.letter;
            return (
              <button
                key={opt.letter}
                type="button"
                onClick={() => onAnswer(opt.letter)}
                disabled={!!selected}
                className={cn(
                  "text-left p-3.5 rounded-xl border transition-colors flex gap-3",
                  !selected && "border-[var(--pjus-hairline)] hover:border-brand-gold/50 hover:bg-brand-gold/5",
                  selected && optIsCorrect && "border-emerald-500/50 bg-emerald-50",
                  selected && optIsSelected && !optIsCorrect && "border-destructive/50 bg-[#fbf2f3]",
                  selected && !optIsSelected && !optIsCorrect && "border-[var(--pjus-hairline)] opacity-60",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 grid place-items-center w-6 h-6 rounded-full text-[12px] font-bold",
                    selected && optIsCorrect && "bg-emerald-500 text-white",
                    selected && optIsSelected && !optIsCorrect && "bg-destructive text-white",
                    (!selected || (!optIsSelected && !optIsCorrect)) && "bg-brand-gold/15 text-brand-primary",
                  )}
                >
                  {opt.letter}
                </span>
                <span className="text-[14px] text-brand-ink leading-relaxed">
                  <InlineText text={opt.text} />
                </span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            className={cn(
              "p-4 rounded-xl border text-[13.5px] leading-relaxed",
              isCorrect ? "border-emerald-500/30 bg-emerald-50" : "border-destructive/25 bg-[#fbf2f3]",
            )}
          >
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <MI name={isCorrect ? "check_circle" : "cancel"} size={16} />
              {isCorrect ? "Você acertou" : "Você errou"} — gabarito: {q.correctLetter}
            </p>
            <p className="text-brand-ink-2 m-0">
              <InlineText text={selectedOpt?.justification || q.comment || "Sem justificativa."} />
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove(-1)}
            disabled={state.index === 0}
          >
            Anterior
          </Button>
          {isLast ? (
            <Button size="sm" onClick={onFinish} disabled={!selected}>
              Ver resultado
            </Button>
          ) : (
            <Button size="sm" onClick={() => onMove(1)} disabled={!selected}>
              Próxima questão
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamResult({
  state,
  onRestart,
}: {
  state: Extract<State, { kind: "result" }>;
  onRestart: () => void;
}) {
  const correct = useMemo(
    () => state.questions.reduce((acc, q, i) => acc + (state.answers[i] === q.correctLetter ? 1 : 0), 0),
    [state],
  );
  const total = state.questions.length;
  const percent = Math.round((correct / total) * 100);

  return (
    <div className="space-y-4">
      <div className="p-7 rounded-2xl border border-[var(--pjus-hairline)] bg-white grid place-items-center gap-3 text-center">
        <Eyebrow>Resultado do simulado</Eyebrow>
        <h2 className="font-display text-brand-ink text-3xl">
          {correct} de {total} acertos
        </h2>
        <div
          className="grid place-items-center w-24 h-24 rounded-full font-display text-2xl font-bold text-brand-primary"
          style={{
            background: `conic-gradient(rgb(var(--brand-gold)) ${percent}%, rgb(var(--brand-gold) / 0.15) 0)`,
          }}
        >
          <span className="grid place-items-center w-[5.2rem] h-[5.2rem] rounded-full bg-white">
            {percent}%
          </span>
        </div>
        <p className="text-sm text-brand-ink-2 max-w-md leading-relaxed">
          {percent >= 70
            ? "Bom desempenho. Foque em lapidar os detalhes."
            : "Vale revisar os pontos errados e refazer depois."}
        </p>
        <Button onClick={onRestart} className="mt-1">
          <MI name="refresh" size={16} />
          Novo simulado
        </Button>
      </div>

      <div className="grid gap-2">
        {state.questions.map((q, i) => {
          const sel = state.answers[i] || "—";
          const ok = sel === q.correctLetter;
          return (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl border text-[13px] leading-relaxed",
                ok ? "border-emerald-500/25 bg-emerald-50/60" : "border-destructive/20 bg-[#fbf2f3]",
              )}
            >
              <strong className="font-display text-brand-ink">
                Questão {i + 1}: {ok ? "correta" : "revisar"}
              </strong>
              <p className="mt-1 text-brand-ink-2 m-0">
                <InlineText text={q.statement} />
              </p>
              <span className="text-[12px] text-brand-ink-2">
                Sua resposta: {sel} · Gabarito: {q.correctLetter}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
