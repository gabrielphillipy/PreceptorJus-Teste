/**
 * Loader honesto — single spinner + label específico.
 * Não imita "fake AI typing" steps em loop (anti-padrão identificado no audit).
 */
import { MI } from "@/components/brand/MaterialIcon";

interface StudyLoaderProps {
  kind?: "study" | "exam" | "flashcards" | "chat";
}

const LABELS = {
  study: {
    title: "Redigindo nota jurídica",
    subtitle: "Organizando fatos, fundamentos e pontos de prova.",
  },
  exam: {
    title: "Montando simulado",
    subtitle: "Criando enunciado, alternativas e gabarito.",
  },
  flashcards: {
    title: "Criando flashcards",
    subtitle: "Transformando o tema em perguntas objetivas de revisão.",
  },
  chat: {
    title: "Analisando juridicamente",
    subtitle: "Buscando fundamentos e referências.",
  },
};

export function StudyLoader({ kind = "study" }: StudyLoaderProps) {
  const cfg = LABELS[kind];
  return (
    <div className="relative grid place-items-center gap-5 min-h-[420px] p-10 rounded-2xl border border-[var(--pjus-hairline)] bg-white overflow-hidden">
      <div
        className="absolute inset-8 rounded-3xl -z-10"
        style={{
          background:
            "radial-gradient(circle at 30% 22%, rgb(var(--brand-gold) / 0.10), transparent 14rem), radial-gradient(circle at 72% 70%, rgb(var(--brand-primary) / 0.10), transparent 16rem)",
        }}
        aria-hidden
      />

      <div className="relative grid place-items-center w-24 h-24 rounded-full border border-brand-gold/25 bg-white shadow-card">
        <div
          className="absolute -inset-1 rounded-full border-2 border-transparent border-t-brand-gold border-r-brand-gold/40 animate-spin"
          aria-hidden
        />
        <MI name="auto_awesome" size={28} className="text-brand-primary" />
      </div>

      <div className="text-center max-w-md">
        <p className="font-display text-brand-ink text-lg font-bold">{cfg.title}…</p>
        <p className="mt-2 text-sm text-brand-ink-2 leading-relaxed">{cfg.subtitle}</p>
      </div>
    </div>
  );
}
