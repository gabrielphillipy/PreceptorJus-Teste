import { useEffect, useMemo, useRef, useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";

interface Props {
  markdown: string;
  meta: { topic: string };
}

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde",   value: "#bbf7d0" },
  { label: "Azul",    value: "#bfdbfe" },
  { label: "Rosa",    value: "#fecdd3" },
];

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  return escHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let listItems: string[] = [];
  let sectionNum = 0;

  const flushList = () => {
    if (listItems.length) {
      parts.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^-{3,}$/.test(line)) { flushList(); continue; }

    if (line.startsWith("## ")) {
      flushList();
      sectionNum++;
      parts.push(
        `<h2 class="si-heading" data-num="${sectionNum}">${escHtml(line.slice(3).trim().toUpperCase())}</h2>`
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      parts.push(`<h3 class="si-sub">${renderInline(line.slice(4))}</h3>`);
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      listItems.push(`<li class="si-item">${renderInline(bullet[1])}</li>`);
      continue;
    }
    flushList();
    parts.push(`<p class="si-p">${renderInline(line.replace(/^\d+\.\s+/, ""))}</p>`);
  }
  flushList();
  return parts.join("\n");
}

export function StudyInteractive({ markdown, meta }: Props) {
  const storageKey = `pjus_hi_${meta.topic}`;
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  // Load saved highlights on mount
  useEffect(() => {
    if (!contentRef.current) return;
    const saved = localStorage.getItem(storageKey);
    contentRef.current.innerHTML = saved ?? html;
  }, [html, storageKey]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setTooltip(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTooltip({
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + window.scrollY),
    });
  };

  const applyHighlight = (color: string) => {
    // Prevent selection from collapsing on mousedown of button
    document.execCommand("hiliteColor", false, color);
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
    if (contentRef.current) {
      localStorage.setItem(storageKey, contentRef.current.innerHTML);
    }
  };

  const clearHighlights = () => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;
    localStorage.removeItem(storageKey);
    setTooltip(null);
  };

  return (
    <div className="study-interactive">
      {/* Mini toolbar */}
      <div className="study-interactive__bar">
        <span className="study-interactive__hint">
          <MI name="highlight" size={14} />
          Selecione um trecho para grifar
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={clearHighlights}
        >
          <MI name="ink_eraser" size={14} />
          Limpar grifos
        </button>
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        className="pjus-summary study-interactive__content"
        onMouseUp={handleMouseUp}
        contentEditable
        suppressContentEditableWarning
      />

      {/* Highlight color picker */}
      {tooltip && (
        <div
          className="study-hi-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              className="study-hi-btn"
              style={{ background: c.value }}
              aria-label={`Grifar ${c.label}`}
              onMouseDown={(e) => {
                e.preventDefault(); // keep selection alive
                applyHighlight(c.value);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
