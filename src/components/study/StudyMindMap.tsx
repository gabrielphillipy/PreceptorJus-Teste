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

      {/* Visual desktop: árvore radial. Mobile: stack vertical (fallback) */}
      <div className="hidden lg:block">
        <RadialMindMap model={model} />
      </div>

      <div className="lg:hidden grid gap-3">
        <div className="grid gap-2 place-items-center text-center p-7 rounded-2xl border border-brand-gold/35 bg-gradient-to-br from-brand-primary-dark to-brand-primary">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gold">Núcleo</span>
          <strong className="font-display text-white text-base">{model.centralText}</strong>
        </div>
        {model.branches.map((branch) => (
          <MindMapBranchCard key={branch.index} index={branch.index} total={total} branch={branch} />
        ))}
      </div>
    </article>
  );
}

function RadialMindMap({ model }: { model: ReturnType<typeof buildMindMapModel> }) {
  const total = model.branches.length;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-brand-gold/20 p-8 bg-white texture-ruled"
      style={{ minHeight: 720 }}
    >
      <div className="relative" style={{ minHeight: 640 }}>
        {/* Anel decorativo central */}
        <div
          className="absolute left-1/2 top-1/2 w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-gold/20"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--brand-gold) / 0.06), transparent 64%)",
          }}
          aria-hidden
        />

        {/* Núcleo */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-content-center gap-2 w-48 h-48 rounded-full border border-brand-gold/40 text-center text-white shadow-modal"
          style={{ background: "linear-gradient(145deg, rgb(var(--brand-primary-dark)), rgb(var(--brand-primary)))" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gold">Núcleo</span>
          <strong className="font-display text-base leading-snug px-4 break-words">
            {model.centralText}
          </strong>
        </div>

        {/* Branches dispostos em arco -150° → +150° */}
        {model.branches.map((branch, index) => {
          const angle = total > 1 ? -150 + (300 / (total - 1)) * index : 0;
          const radius = index % 2 ? 244 : 214;
          return (
            <article
              key={branch.index}
              className="absolute left-1/2 top-1/2 w-[210px] p-3.5 rounded-2xl border border-[var(--pjus-hairline)] bg-white shadow-card"
              style={{
                ["--angle" as any]: `${angle}deg`,
                ["--radius" as any]: `${radius}px`,
                transform:
                  "translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius)) rotate(calc(var(--angle) * -1))",
              }}
            >
              <span
                className="absolute top-1/2 right-1/2 h-0.5 -z-10 origin-right"
                style={{
                  width: "var(--radius)",
                  transform: "rotate(var(--angle))",
                  background:
                    "linear-gradient(90deg, transparent, rgb(var(--brand-gold) / 0.55))",
                }}
                aria-hidden
              />
              <header className="grid grid-cols-[auto_1fr] gap-2.5 items-center mb-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-brand-primary-dark text-brand-gold font-bold text-[12px]">
                  {String(branch.index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-brand-ink text-[14px] leading-tight m-0 break-words">
                  <InlineText text={branch.title} />
                </h3>
              </header>
              <ul className="grid gap-1.5 m-0 p-0 list-none">
                {branch.points.map((p, i) => (
                  <li key={i} className="relative pl-4 text-[12.5px] leading-snug text-brand-ink-2 break-words">
                    <span
                      className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full bg-brand-gold"
                      aria-hidden
                    />
                    <InlineText text={p} />
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MindMapBranchCard({
  branch,
}: {
  index: number;
  total: number;
  branch: ReturnType<typeof buildMindMapModel>["branches"][number];
}) {
  return (
    <article className="p-3.5 rounded-2xl border border-[var(--pjus-hairline)] bg-white shadow-card">
      <header className="grid grid-cols-[auto_1fr] gap-2.5 items-center mb-2.5">
        <span className="grid place-items-center w-8 h-8 rounded-full bg-brand-primary-dark text-brand-gold font-bold text-[12px]">
          {String(branch.index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-display text-brand-ink text-[14px] leading-tight m-0 break-words">
          <InlineText text={branch.title} />
        </h3>
      </header>
      <ul className="grid gap-1.5 m-0 p-0 list-none">
        {branch.points.map((p, i) => (
          <li key={i} className="relative pl-4 text-[12.5px] leading-snug text-brand-ink-2 break-words">
            <span className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full bg-brand-gold" aria-hidden />
            <InlineText text={p} />
          </li>
        ))}
      </ul>
    </article>
  );
}
