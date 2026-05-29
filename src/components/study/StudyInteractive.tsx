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

function isTableSep(line: string): boolean {
  return /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(line.trim()) && line.includes("-");
}
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && (t.match(/\|/g) || []).length >= 2;
}
function tableCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let sectionNum = 0;

  const flushList = () => {
    if (listItems.length) {
      parts.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows;
    tableRows = [];
    const [headers, ...body] = rows;
    if (body.length === 0) {
      const text = headers.filter(Boolean).join(" · ");
      if (text) parts.push(`<p class="si-p">${renderInline(text)}</p>`);
      return;
    }
    const head = `<thead><tr>${headers.map((h) => `<th>${renderInline(h)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${body
      .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`;
    parts.push(`<div class="si-table-wrap"><table class="si-table">${head}${tbody}</table></div>`);
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (isTableSep(line) && (tableRows.length || isTableRow(line))) { continue; }
    if (isTableRow(line)) { flushList(); tableRows.push(tableCells(line)); continue; }
    flushTable();

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
  flushTable();
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
