import { useState } from "react";
import {
  buildMindMapModel,
  parseStudySections,
  type MindMapPoint,
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

/** Divide um bloco de texto em tópicos curtos para virar lista de bullets. */
function splitIntoTopics(text: string): string[] {
  const clean = String(text || "").trim();
  if (!clean) return [];

  // 1) Quebra em sentenças: ponto/ponto-vírgula/dois-pontos seguido de espaço + maiúscula ou dígito
  const initial = clean
    .replace(/([.;:])\s+(?=[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\d])/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  // 2) Sentenças longas: subdivide por vírgula + conectivo
  const out: string[] = [];
  initial.forEach((line) => {
    if (line.length <= 140) {
      out.push(line);
      return;
    }
    const parts = line.split(
      /,\s+(?=(?:que|onde|cuja|cujo|condicionad[oa]|ressalvad[oa]|salvo|exceto|al[eé]m|tamb[eé]m|por[eé]m|pois|portanto|enquanto|sendo|ou seja|isto [eé])\b)/i,
    );
    parts.forEach((p) => {
      const t = p.trim().replace(/^[,;]\s*/, "");
      if (t.length > 4) out.push(t);
    });
  });

  return out;
}

/** Extrai termos jurídicos relevantes (artigos, leis, súmulas, termos em negrito). */
function extractKeywords(text: string): string[] {
  const set = new Set<string>();
  const t = String(text || "");

  // Artigos
  (t.match(/\bArt\.\s*\d+[º°]?(?:\s*,?\s*[IVX]+)?(?:\s*da\s+CF(?:\/88)?|\s*CF(?:\/88)?)?/gi) || [])
    .forEach((m) => set.add(m.trim()));

  // Leis numeradas
  (t.match(/\bLei\s+(?:Complementar\s+)?(?:n[º°]?\.?\s*)?[\d.]+\/\d{2,4}/gi) || [])
    .forEach((m) => set.add(m.trim()));

  // Leis nomeadas comuns
  (t.match(/\b(?:LGPD|CF\/88|CDC|CLT|CPC|CPP|CTN|ECA|Marco Civil(?:\s+da\s+Internet)?)\b/g) || [])
    .forEach((m) => set.add(m.trim()));

  // Súmulas
  (t.match(/\bS[úu]mula(?:\s+Vinculante)?\s+\d+/gi) || [])
    .forEach((m) => set.add(m.trim()));

  // Termos em negrito (markdown **xxx**)
  (t.match(/\*\*([^*]+)\*\*/g) || []).forEach((b) => {
    const clean = b.replace(/\*\*/g, "").trim();
    if (clean.length > 2 && clean.length < 36) set.add(clean);
  });

  return Array.from(set).slice(0, 8);
}

export function StudyMindMap({ markdown, meta }: StudyMindMapProps) {
  const sections = parseStudySections(markdown, meta);
  const model = buildMindMapModel(sections, meta);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded((prev) => (prev === key ? null : key));

  return (
    <article className="animate-fade-up">
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
                        title={branch.fullTitle}
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
                            branchTitle={branch.fullTitle}
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
  point: MindMapPoint;
  index: number;
  isOpen: boolean;
  palette: (typeof BRANCH_COLORS)[number];
  branchTitle: string;
  onClick: () => void;
}

function PointCard({ point, index, isOpen, palette, branchTitle, onClick }: PointCardProps) {
  const hasMore = point.full && point.full.length > point.short.length;
  const topics = isOpen ? splitIntoTopics(point.full) : [];
  const keywords = isOpen ? extractKeywords(point.full) : [];

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
          ? `0 6px 20px -4px ${palette.bg}33`
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
          {/* Fechado: short text. Aberto: short como título + bullets de tópicos */}
          {!isOpen ? (
            <>
              <p
                className="m-0 leading-snug break-words"
                style={{ fontSize: 12.5, color: "rgb(var(--brand-ink-2))", fontWeight: 500 }}
              >
                <InlineText text={point.short} />
              </p>
              {hasMore && (
                <p
                  className="m-0 mt-1 font-medium"
                  style={{ fontSize: 10, color: palette.border, opacity: 0.85 }}
                >
                  ver detalhe →
                </p>
              )}
            </>
          ) : (
            <>
              <p
                className="m-0 mb-2.5 leading-snug break-words font-display"
                style={{ fontSize: 13, color: palette.text, fontWeight: 700 }}
              >
                <InlineText text={point.short} />
              </p>

              {/* Bullets de tópicos */}
              {topics.length > 0 && (
                <ul className="grid gap-1.5 m-0 p-0 list-none">
                  {topics.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 leading-snug break-words"
                      style={{ fontSize: 11.5, color: "rgb(var(--brand-ink-2))" }}
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 4,
                          height: 4,
                          marginTop: 7,
                          background: palette.accent,
                        }}
                        aria-hidden
                      />
                      <span style={{ flex: 1 }}>
                        <InlineText text={t} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Termos-chave */}
              {keywords.length > 0 && (
                <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${palette.border}40` }}>
                  <p
                    className="font-bold uppercase m-0 mb-1.5"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      color: palette.text,
                      opacity: 0.7,
                    }}
                  >
                    Termos-chave
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((k, i) => (
                      <span
                        key={i}
                        className="rounded-md px-2 py-0.5 font-medium break-words"
                        style={{
                          fontSize: 10,
                          background: "#ffffff",
                          border: `1px solid ${palette.border}60`,
                          color: palette.text,
                          maxWidth: "100%",
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
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
