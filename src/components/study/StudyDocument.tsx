import { cn } from "@/lib/utils";
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

interface StudyDocumentProps {
  markdown: string;
  meta: StudyMeta;
}

function isDeepeningSection(title: string) {
  return /aprofund|bibliograf|livros|leitura complementar|fontes recomendadas/i.test(title);
}

export function StudyDocument({ markdown, meta }: StudyDocumentProps) {
  const sections = parseStudySections(markdown, meta).filter((s) => s.items.length > 0 && !s.intro);

  return (
    <article className="pjus-summary animate-fade-up">
      <div>
        {sections.map((section, index) => (
          <StudySection key={index} section={section} index={index} isFirst={index === 0} />
        ))}
      </div>
    </article>
  );
}

function StudySection({
  section,
  index,
  isFirst,
}: {
  section: StudySectionParsed;
  index: number;
  isFirst: boolean;
}) {
  const isQuestions = isQuestionSection(section.title);
  const isDeepening = isDeepeningSection(section.title);

  return (
    <div
      className={cn(
        "px-6 py-6",
        !isFirst && "border-t border-brand-gold/[0.07]",
        isDeepening && "bg-[var(--pjus-surface-2)]",
      )}
    >
      <h2 className="study-section-title">
        <span className="study-section-title__num">{index + 1}.</span>
        <InlineText text={section.title.toUpperCase()} />
      </h2>
      <div className="mt-5">
        {isQuestions ? (
          <QuestionsBlock rawLines={section.rawLines} />
        ) : (
          <ItemsBlock items={section.items} />
        )}
      </div>
    </div>
  );
}

function ItemsBlock({ items }: { items: StudyLineItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item, i) => {
        if (item.type === "subheading") {
          return (
            <h3 key={i} className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-ink mt-2">
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
            <p key={i} className="m-0 text-[14px] leading-relaxed text-brand-ink-2">
              <InlineText text={item.text} />
            </p>
          );
        }
        if (item.type === "table") {
          return (
            <div key={i} className="pjus-table-wrap">
              <table className="pjus-table">
                <thead>
                  <tr>
                    {item.headers.map((h, j) => (
                      <th key={j}><InlineText text={h} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}><InlineText text={cell} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // list
        return (
          <ul key={i} className="grid gap-2 m-0 p-0 list-none">
            {item.items.map((li, j) => (
              <li
                key={j}
                className="pl-4 border-l-2 border-brand-gold/40 text-[14px] leading-relaxed text-brand-ink-2 py-0.5"
              >
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
