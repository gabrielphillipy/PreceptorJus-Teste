import {
  buildMindMapModel,
  parseStudySections,
  type StudyMeta,
} from "@/lib/study-parser";
import { InlineText } from "@/components/study/InlineText";

interface StudyMindMapProps {
  markdown: string;
  meta: StudyMeta;
}

/* Paleta por ramo: accent, fundo suave, borda */
const BRANCH_PALETTES = [
  { accent: "#C9A84C", bg: "rgba(201,168,76,0.07)",  border: "rgba(201,168,76,0.35)", badge: "#7A5E1A" },
  { accent: "#4A7FA5", bg: "rgba(74,127,165,0.07)",  border: "rgba(74,127,165,0.30)", badge: "#2C5577" },
  { accent: "#5A8A6A", bg: "rgba(90,138,106,0.07)",  border: "rgba(90,138,106,0.30)", badge: "#2E5C3E" },
  { accent: "#A55A5A", bg: "rgba(165,90,90,0.07)",   border: "rgba(165,90,90,0.30)",  badge: "#6B2929" },
];

export function StudyMindMap({ markdown, meta }: StudyMindMapProps) {
  const sections = parseStudySections(markdown, meta);
  const model = buildMindMapModel(sections, meta);
  const total = model.branches.length;

  return (
    <article className="space-y-5 animate-fade-up">
      <header className="pjus-summary relative overflow-hidden">
        <div
          className="absolute right-6 -bottom-6 w-32 h-32 rounded-full border border-brand-gold/30 bg-[radial-gradient(circle,rgb(var(--brand-gold)/0.18),transparent_70%)] pointer-events-none"
          aria-hidden
        />
        <div className="pjus-summary__head">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-brand-gold">Mapa mental</p>
          <h2 className="font-display text-brand-ink text-[1.65rem] mt-2 leading-tight max-w-[42ch]">
            {model.topic}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[13.5px] text-brand-ink-2 leading-relaxed">
            Ramos de revisão rápida para conectar conceito, base legal, requisitos e pontos de prova.
          </p>
        </div>
      </header>

      {/* Desktop: árvore radial */}
      <div className="hidden lg:block">
        <RadialMindMap model={model} total={total} />
      </div>

      {/* Mobile / tablet: grid 2 colunas */}
      <div className="lg:hidden">
        <MobileStack model={model} total={total} />
      </div>
    </article>
  );
}

/* ─── Desktop: layout radial ─────────────────────────────────────────────── */

function RadialMindMap({
  model,
  total,
}: {
  model: ReturnType<typeof buildMindMapModel>;
  total: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-brand-gold/20"
      style={{
        minHeight: 760,
        background:
          "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(27,42,65,0.03) 0%, transparent 70%), #f8f9fa",
        backgroundImage: `
          radial-gradient(ellipse 90% 70% at 50% 50%, rgba(27,42,65,0.03) 0%, transparent 70%),
          radial-gradient(circle, rgba(201,168,76,0.12) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 28px 28px",
      }}
    >
      <div className="relative" style={{ minHeight: 680 }}>

        {/* Anel decorativo externo */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 520,
            height: 520,
            border: "1px dashed rgba(201,168,76,0.18)",
          }}
          aria-hidden
        />

        {/* Anel decorativo interno */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 330,
            height: 330,
            background: "radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%)",
            border: "1px solid rgba(201,168,76,0.22)",
          }}
          aria-hidden
        />

        {/* Conectores: partem do centro */}
        {model.branches.map((branch, index) => {
          const angle = total > 1 ? -150 + (300 / (total - 1)) * index : 0;
          const radius = index % 2 ? 248 : 218;
          const palette = BRANCH_PALETTES[index % BRANCH_PALETTES.length];
          return (
            <div
              key={`connector-${index}`}
              className="absolute left-1/2 top-1/2 pointer-events-none"
              style={{
                width: radius,
                height: 2,
                transformOrigin: "0 50%",
                transform: `translateY(-50%) rotate(${angle}deg)`,
                background: `linear-gradient(90deg, ${palette.accent}70, ${palette.accent}18)`,
              }}
              aria-hidden
            />
          );
        })}

        {/* Núcleo central */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-content-center gap-2 text-center text-white"
          style={{
            width: 176,
            height: 176,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #0B1320, #1B2A41)",
            boxShadow: "0 0 0 6px rgba(201,168,76,0.14), 0 12px 40px -8px rgba(27,42,65,0.55)",
            border: "1.5px solid rgba(201,168,76,0.45)",
          }}
        >
          <span
            className="font-body font-bold uppercase"
            style={{ fontSize: 9, letterSpacing: "0.16em", color: "#C9A84C" }}
          >
            Núcleo
          </span>
          <strong
            className="font-display leading-snug break-words px-3"
            style={{ fontSize: 14 }}
          >
            {model.centralText}
          </strong>
        </div>

        {/* Cards dos ramos */}
        {model.branches.map((branch, index) => {
          const angle = total > 1 ? -150 + (300 / (total - 1)) * index : 0;
          const radius = index % 2 ? 248 : 218;
          const palette = BRANCH_PALETTES[index % BRANCH_PALETTES.length];
          return (
            <article
              key={branch.index}
              className="absolute left-1/2 top-1/2 transition-transform duration-200 hover:-translate-y-1"
              style={{
                width: 218,
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)`,
                borderRadius: 16,
                background: "#ffffff",
                border: `1.5px solid ${palette.border}`,
                boxShadow: `0 4px 20px -6px rgba(27,42,65,0.10), 0 0 0 0 ${palette.accent}00`,
                overflow: "hidden",
              }}
            >
              {/* Faixa de cor superior */}
              <div style={{ height: 3, background: palette.accent }} />

              <div className="p-3.5">
                <header className="flex items-center gap-2.5 mb-3">
                  <span
                    className="grid place-items-center shrink-0 font-bold"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: palette.badge,
                      color: "#fff",
                      fontSize: 11,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {String(branch.index + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="font-display leading-tight m-0 break-words"
                    style={{ fontSize: 13, color: "rgb(var(--brand-ink))" }}
                  >
                    <InlineText text={branch.title} />
                  </h3>
                </header>

                <ul className="grid gap-2 m-0 p-0 list-none">
                  {branch.points.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 leading-snug break-words"
                      style={{ fontSize: 12, color: "rgb(var(--brand-ink-2))" }}
                    >
                      <span
                        className="shrink-0 mt-[0.42em] rounded-full"
                        style={{ width: 5, height: 5, background: palette.accent }}
                        aria-hidden
                      />
                      <InlineText text={p} />
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Mobile: stack visual ───────────────────────────────────────────────── */

function MobileStack({
  model,
  total,
}: {
  model: ReturnType<typeof buildMindMapModel>;
  total: number;
}) {
  return (
    <div className="grid gap-4">
      {/* Núcleo */}
      <div
        className="grid place-items-center text-center p-6 rounded-2xl"
        style={{
          background: "linear-gradient(145deg, #0B1320, #1B2A41)",
          border: "1.5px solid rgba(201,168,76,0.40)",
          boxShadow: "0 8px 32px -8px rgba(27,42,65,0.40)",
        }}
      >
        <span
          className="font-body font-bold uppercase mb-2"
          style={{ fontSize: 9, letterSpacing: "0.16em", color: "#C9A84C" }}
        >
          Núcleo
        </span>
        <strong className="font-display text-white text-base leading-snug">
          {model.centralText}
        </strong>
      </div>

      {/* Grade de ramos: 2 colunas em sm, 1 coluna em xs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {model.branches.map((branch, index) => {
          const palette = BRANCH_PALETTES[index % BRANCH_PALETTES.length];
          return (
            <article
              key={branch.index}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#fff",
                border: `1.5px solid ${palette.border}`,
                boxShadow: "0 2px 12px -4px rgba(27,42,65,0.08)",
              }}
            >
              <div style={{ height: 3, background: palette.accent }} />
              <div className="p-4">
                <header className="flex items-center gap-2.5 mb-3">
                  <span
                    className="grid place-items-center shrink-0 font-bold"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: palette.badge,
                      color: "#fff",
                      fontSize: 10,
                    }}
                  >
                    {String(branch.index + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="font-display leading-tight m-0"
                    style={{ fontSize: 13.5, color: "rgb(var(--brand-ink))" }}
                  >
                    <InlineText text={branch.title} />
                  </h3>
                </header>

                <ul className="grid gap-2 m-0 p-0 list-none">
                  {branch.points.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 leading-snug"
                      style={{ fontSize: 12.5, color: "rgb(var(--brand-ink-2))" }}
                    >
                      <span
                        className="shrink-0 mt-[0.44em] rounded-full"
                        style={{ width: 5, height: 5, background: palette.accent }}
                        aria-hidden
                      />
                      <InlineText text={p} />
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      {/* Legenda de cores */}
      {total > 1 && (
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {model.branches.map((branch, index) => {
            const palette = BRANCH_PALETTES[index % BRANCH_PALETTES.length];
            return (
              <span
                key={index}
                className="flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1"
                style={{ background: palette.bg, color: palette.badge, border: `1px solid ${palette.border}` }}
              >
                <span
                  className="rounded-full"
                  style={{ width: 6, height: 6, background: palette.accent }}
                />
                {branch.title}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
