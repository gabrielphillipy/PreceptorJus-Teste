import type { StudyQuestion } from "@/lib/study-parser";
import { InlineText } from "@/components/study/InlineText";

export function StudyQuestionCard({ question }: { question: StudyQuestion }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-brand-gold/25 bg-white p-5 shadow-card">
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-primary-dark to-brand-gold"
        aria-hidden
      />
      <div className="inline-flex items-center min-h-7 mb-3 px-2.5 rounded-full border border-brand-gold/30 bg-white text-[10px] font-bold uppercase tracking-[0.12em] text-brand-gold">
        Questão {question.number}
      </div>

      <div className="grid gap-2 mb-3">
        {question.stem.map((line, i) => (
          <p key={i} className="text-[14px] leading-relaxed text-brand-ink">
            <InlineText text={line} />
          </p>
        ))}
      </div>

      {question.options.length > 0 && (
        <div className="grid gap-2">
          {question.options.map((opt) => (
            <div
              key={opt.letter}
              className="grid grid-cols-[auto_1fr] gap-2.5 items-start min-h-11 px-3 py-2.5 rounded-md border border-[var(--pjus-hairline)] bg-white/80"
            >
              <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-primary-dark text-white text-[12px] font-bold">
                {opt.letter}
              </span>
              <p className="text-[13.5px] text-brand-ink-2 leading-snug m-0">
                <InlineText text={opt.text} />
              </p>
            </div>
          ))}
        </div>
      )}

      {(question.answer || question.comment.length > 0) && (
        <div className="mt-4 p-3.5 rounded-md border border-brand-primary/15 border-l-4 border-l-brand-primary-dark bg-[#f0f7f5]">
          {question.answer && (
            <strong className="block mb-1 font-display text-brand-primary-dark text-[13.5px]">
              Gabarito: {question.answer}
            </strong>
          )}
          {question.comment.length > 0 && (
            <p className="text-[13px] leading-relaxed m-0">
              <InlineText text={question.comment.join(" ")} />
            </p>
          )}
        </div>
      )}
    </article>
  );
}
