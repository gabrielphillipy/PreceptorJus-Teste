import { useEffect, useMemo, useRef, useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";
import { markdownToHtml } from "@/lib/study-markdown";

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
