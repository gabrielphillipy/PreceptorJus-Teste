import { useState } from "react";
import {
  buildMindMapModel,
  parseStudySections,
  type StudyMeta,
} from "@/lib/study-parser";
import { InlineText } from "@/components/study/InlineText";
import { MI } from "@/components/brand/MaterialIcon";

interface StudyMindMapProps {
  markdown: string;
  meta: StudyMeta;
}

const BRANCH_COLORS = [
  { bg: "#1A3A2E", accent: "#52C98A", light: "#EEF9F4", border: "#2D6A4F", text: "#1A3A2E" },
  { bg: "#1B2A41", accent: "#6B9ED4", light: "#EEF3FA", border: "#2D527A", text: "#1B2A41" },
  { bg: "#7A5C00", accent: "#C9A84C", light: "#FAF5E8", border: "#A88300", text: "#7A5C00" },
  { bg: "#3A1A38", accent: "#B46ED4", light: "#F7F0FA", border: "#7A3A8A", text: "#3A1A38" },
  { bg: "#1A3A3A", accent: "#4CC4C4", light: "#EEF9F9", border: "#2D7A7A", text: "#1A3A3A" },
  { bg: "#2A2A1A", accent: "#A4B44C", light: "#F5F7EE", border: "#6A7A2D", text: "#2A2A1A" },
];

const BRANCH_ICONS: Record<string, string> = {
  conceito: "lightbulb",
  definição: "lightbulb",
  base: "gavel",
  legal: "gavel",
  lei: "gavel",
  norma: "gavel",
  requisito: "checklist",
  elemento: "checklist",
  prova: "quiz",
  questão: "quiz",
  pegadinha: "quiz",
  exceção: "warning",
  revisão: "sync",
};

function getBranchIcon(title: string, i: number): string {
  const t = title.toLowerCase();
  for (const [kw, icon] of Object.entries(BRANCH_ICONS)) {
    if (t.includes(kw)) return icon;
  }
  return ["lightbulb", "gavel", "checklist", "quiz", "warning", "description"][i % 6];
}

export function StudyMindMap({ markdown, meta }: StudyMindMapProps) {
  const sections = parseStudySections(markdown, meta);
  const model = buildMindMapModel(sections, meta);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded((prev) => (prev === key ? null : key));

  return (
    <article className="animate-fade-up space-y-5">
      {/* Cabeçalho */}
      <header className="pjus-summary relative overflow-hidden">
        <div
          className="absolute right-6 -bottom-6 w-32 h-32 rounded-full pointer-events-none"
          style={{
            border: "1px solid rgba(201,168,76,0.28)",
            background: "radial-gradient(circle, rgba(201,168,76,0.15), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="pjus-summary__head">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-brand-gold">
            Mapa mental
          </p>
          <h2 className="font-display text-brand-ink text-[1.65rem] mt-2 leading-tight max-w-[42ch]">
            {model.topic}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[13.5px] text-brand-ink-2 leading-relaxed">
            Clique nos cards para expandir cada ponto.
          </p>
        </div>
      </header>

      {/* Árvore */}
      <div
        className="rounded-2xl overflow-x-auto border border-brand-gold/20"
        style={{
          background: "#f8f9fa",
          backgroundImage:
            "radial-gradient(circle, rgba(201,168,76,0.10) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div style={{ minWidth: Math.max(720, model.branches.length * 220), padding: "36px 32px 40px" }}>
          {/* Nó central */}
          <div className="flex justify-center">
            <div
              className="text-center text-white rounded-2xl px-8 py-4"
              style={{
                background: "linear-gradient(135deg, #0B1320 0%, #1B2A41 100%)",
                border: "1.5px solid rgba(201,168,76,0.50)",
                boxShadow:
                  "0 0 0 5px rgba(201,168,76,0.10), 0 8px 32px -8px rgba(11,19,32,0.55)",
                minWidth: 220,
                maxWidth: 340,
              }}
            >
              <span
                className="flex items-center justify-center gap-1.5 font-bold uppercase mb-2"
                style={{ fontSize: 9, letterSpacing: "0.18em", color: "#C9A84C" }}
              >
                <MI name="hub" size={12} />
                Tema Central
              </span>
              <strong className="font-display leading-snug block" style={{ fontSize: 17 }}>
                {model.centralText}
              </strong>
            </div>
          </div>

          {/* Linha vertical: centro → backbone */}
          <div className="flex justify-center">
            <div
              style={{ width: 2, height: 28, background: "rgba(201,168,76,0.35)" }}
              aria-hidden
            />
          </div>

          {/* Backbone horizontal + colunas */}
          <div className="relative">
            {/* Backbone */}
            <div
              className="absolute top-0"
              style={{
                left: `${100 / (model.branches.length * 2)}%`,
                right: `${100 / (model.branches.length * 2)}%`,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, rgba(201,168,76,0.30) 15%, rgba(201,168,76,0.30) 85%, transparent)",
              }}
              aria-hidden
            />

            {/* Colunas de ramos */}
            <div className="flex gap-3 pt-0">
              {model.branches.map((branch, index) => {
                const p = BRANCH_COLORS[index % BRANCH_COLORS.length];
                const icon = getBranchIcon(branch.title, index);

                return (
                  <div
                    key={branch.index}
                    className="flex-1 flex flex-col items-center"
                    style={{ minWidth: 190 }}
                  >
                    {/* Drop do backbone ao header */}
                    <div
                      style={{ width: 2, height: 24, background: p.accent + "70" }}
                      aria-hidden
                    />

                    {/* Header do ramo */}
                    <div
                      className="w-full rounded-xl text-white text-center px-3 py-3 mb-3"
                      style={{
                        background: p.bg,
                        border: `1.5px solid ${p.border}`,
                        boxShadow: `0 4px 20px -6px ${p.bg}99`,
                      }}
                    >
                      <span style={{ color: p.accent, display: "block", marginBottom: 4 }}>
                        <MI name={icon} size={20} />
                      </span>
                      <p
                        className="font-display font-bold uppercase m-0"
                        style={{ fontSize: 11, letterSpacing: "0.09em", color: "#fff" }}
                      >
                        <InlineText text={branch.title} />
                      </p>
                      <p
                        className="m-0 mt-1"
                        style={{ fontSize: 10, color: p.accent }}
                      >
                        {branch.points.length}{" "}
                        {branch.points.length === 1 ? "ponto" : "pontos"}
                      </p>
                    </div>

                    {/* Cards expansíveis */}
                    <div className="w-full grid gap-2">
                      {branch.points.map((point, pi) => {
                        const key = `${branch.index}-${pi}`;
                        const isOpen = expanded === key;
                        return (
                          <PointCard
                            key={pi}
                            point={point}
                            index={pi}
                            isOpen={isOpen}
                            palette={p}
                            branchTitle={branch.title}
                            onClick={() => toggle(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

interface PointCardProps {
  point: string;
  index: number;
  isOpen: boolean;
  palette: (typeof BRANCH_COLORS)[number];
  branchTitle: string;
  onClick: () => void;
}

function PointCard({ point, index, isOpen, palette, branchTitle, onClick }: PointCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl"
      style={{
        padding: "10px 12px",
        background: isOpen ? palette.light : "#ffffff",
        border: `1.5px solid ${isOpen ? palette.border : "rgba(226,230,229,0.80)"}`,
        boxShadow: isOpen
          ? `0 4px 16px -4px ${palette.bg}22`
          : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "all 0.18s ease",
        cursor: "pointer",
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Badge numerado */}
        <span
          className="shrink-0 grid place-items-center font-bold rounded-full text-white"
          style={{
            width: 20,
            height: 20,
            fontSize: 9,
            marginTop: 2,
            background: isOpen ? palette.bg : "#b0b7be",
            flexShrink: 0,
            transition: "background 0.18s ease",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p
            className="m-0 leading-snug break-words"
            style={{
              fontSize: 12,
              color: isOpen ? palette.text : "rgb(var(--brand-ink-2))",
              fontWeight: isOpen ? 600 : 500,
              transition: "color 0.18s ease",
            }}
          >
            <InlineText text={point} />
          </p>

          {/* Detalhe expandido */}
          {isOpen && (
            <div
              className="mt-2 pt-2 flex items-center gap-1.5"
              style={{ borderTop: `1px solid ${palette.border}40` }}
            >
              <span
                className="rounded-full px-2 py-0.5 text-white font-medium uppercase"
                style={{ fontSize: 9, letterSpacing: "0.08em", background: palette.bg }}
              >
                {branchTitle}
              </span>
            </div>
          )}
        </div>

        {/* Seta */}
        <span
          style={{
            color: palette.border,
            flexShrink: 0,
            marginTop: 2,
            transition: "transform 0.18s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            display: "flex",
          }}
        >
          <MI name="keyboard_arrow_down" size={14} />
        </span>
      </div>
    </button>
  );
}
