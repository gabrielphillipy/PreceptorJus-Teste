import { tokenizeInline } from "@/lib/study-parser";

/**
 * Renderiza um trecho de texto com bold (**...**) e tokens jurídicos
 * (Art. X, STF, STJ, OAB, CF, CPC, CC...) destacados como <mark>.
 * Sem dangerouslySetInnerHTML.
 */
export function InlineText({ text }: { text: string }) {
  const fragments = tokenizeInline(text);
  return (
    <>
      {fragments.map((f, i) => {
        if (f.kind === "bold") return <strong key={i}>{f.value}</strong>;
        if (f.kind === "mark")
          return (
            <mark key={i} className="px-1 rounded bg-brand-gold/20 text-[#6f4d18] font-semibold">
              {f.value}
            </mark>
          );
        return <span key={i}>{f.value}</span>;
      })}
    </>
  );
}
