import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import {
  isQuestionSection,
  parseStudyQuestions,
  parseStudySections,
  type StudyLineItem,
  type StudyMeta,
  type StudySectionParsed,
} from "@/lib/study-parser";
import { InlineText } from "@/components/study/InlineText";
import { StudyQuestionCard } from "@/components/study/StudyQuestionCard";
import { MI } from "@/components/brand/MaterialIcon";

interface StudyDocumentProps {
  markdown: string;
  meta: StudyMeta;
}

function isDeepeningSection(title: string) {
  return /aprofund|bibliograf|livros|leitura complementar|fontes recomendadas/i.test(title);
}

export function StudyDocument({ markdown, meta }: StudyDocumentProps) {
  const sections = parseStudySections(markdown, meta).filter((s) => s.items.length > 0);

  return (
    <article className="space-y-5 animate-fade-up">
      {/* Capa */}
      <section className="pjus-summary relative overflow-hidden">
        <div
          className="absolute right-6 -bottom-6 w-32 h-32 rounded-full border border-brand-gold/30 bg-[radial-gradient(circle,rgb(var(--brand-gold)/0.18),transparent_70%)] pointer-events-none"
          aria-hidden
        />
        <div className="pjus-summary__head">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-brand-gold">
            {meta.modeLabel || "Nota jurídica"}
          </p>
          <h2 className="font-display text-brand-ink text-[1.65rem] mt-2 leading-tight max-w-[42ch]">
            {meta.topic || "Estudo jurídico"}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[13.5px] text-brand-ink-2 leading-relaxed">
            Material organizado para leitura, revisão e treino. Confira sempre fontes oficiais quando houver citação
            normativa, jurisprudencial ou sumular.
          </p>
        </div>
        <div className="pjus-summary__foot">
          <span>
            <MI name="auto_awesome" size={14} />
            Gerado por {BRAND.name}
          </span>
          <span>
            <MI name="event" size={14} />
            {new Date().toLocaleDateString("pt-BR")}
          </span>
        </div>
      </section>

      {sections.map((section, index) => (
        <StudySection key={index} section={section} index={index} total={sections.length} />
      ))}
    </article>
  );
}

function StudySection({
  section,
  index,
  total,
}: {
  section: StudySectionParsed;
  index: number;
  total: number;
}) {
  const isQuestions = isQuestionSection(section.title);
  const isDeepening = isDeepeningSection(section.title);
  const sectionNumber = String(index + 1).padStart(2, "0");

  return (
    <section
      className={cn(
        "pjus-summary relative",
        isDeepening && "border-brand-gold/40 bg-[var(--pjus-surface-2)]",
      )}
    >
      <header className="grid grid-cols-[1fr_auto] gap-3 items-center px-6 py-5 border-b border-[var(--pjus-hairline)] bg-[var(--pjus-surface-2)]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-brand-gold">
            {isDeepening ? "Bibliografia" : section.intro ? "Abertura" : `Seção ${sectionNumber}`}
          </span>
          <h2 className="font-display text-brand-ink mt-1 text-xl leading-tight">
            <InlineText text={section.title} />
          </h2>
        </div>
        <small className="px-2.5 py-1.5 rounded-full border border-brand-gold/25 bg-white text-[10px] font-bold text-brand-gold uppercase tracking-[0.12em]">
          {sectionNumber}/{String(total).padStart(2, "0")}
        </small>
      </header>

      <div className="px-6 py-6">
        {isQuestions ? (
          <QuestionsBlock rawLines={section.rawLines} />
        ) : (
          <ItemsBlock items={section.items} />
        )}
      </div>
    </section>
  );
}

function ItemsBlock({ items }: { items: StudyLineItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item, i) => {
        if (item.type === "subheading") {
          return (
            <h3 key={i} className="font-display text-brand-ink mt-2 text-base">
              <InlineText text={item.text} />
            </h3>
          );
        }
        if (item.type === "paragraph") {
          if (item.legal) {
            return (
              <p key={i} className="pjus-legal m-0 text-[14px] leading-relaxed">
                <InlineText text={item.text} />
              </p>
            );
          }
          return (
            <p
              key={i}
              className="m-0 pl-3.5 border-l-2 border-brand-gold/20 text-[14px] leading-relaxed text-brand-ink-2"
            >
              <InlineText text={item.text} />
            </p>
          );
        }
        // list
        return (
          <ul key={i} className="grid gap-2 m-0 p-0 list-none">
            {item.items.map((li, j) => (
              <li
                key={j}
                className="relative pl-10 pr-4 py-3 rounded-lg border border-[var(--pjus-hairline)] bg-white/80 text-[14px] leading-relaxed text-brand-ink-2 transition-all hover:border-brand-gold/40 hover:translate-x-1"
              >
                <span
                  className="absolute left-3 top-3 grid place-items-center w-5 h-5 rounded-full bg-brand-primary-dark text-brand-gold text-[11px] font-bold"
                  aria-hidden
                >
                  §
                </span>
                <InlineText text={li} />
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

function QuestionsBlock({ rawLines }: { rawLines: string[] }) {
  const questions = parseStudyQuestions(rawLines);
  if (questions.length === 0) {
    // fallback: renderiza como itens normais
    const fakeSection = parseStudySections(rawLines.join("\n"), { topic: "" })[0];
    return <ItemsBlock items={fakeSection?.items || []} />;
  }
  return (
    <div className="grid gap-3.5">
      {questions.map((q, i) => (
        <StudyQuestionCard key={i} question={q} />
      ))}
    </div>
  );
}
