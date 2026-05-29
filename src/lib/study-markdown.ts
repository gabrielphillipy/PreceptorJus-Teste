/**
 * Converte o markdown gerado pela IA em HTML para as visões que usam
 * renderização direta (Estudo Interativo + preview de streaming).
 *
 * Mantém suporte a: ## headings, ### subheadings, listas, **bold**,
 * tabelas markdown (| a | b |) e parágrafos.
 */

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderInline(text: string): string {
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

export function markdownToHtml(markdown: string): string {
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
        `<h2 class="si-heading" data-num="${sectionNum}">${escHtml(line.slice(3).trim().toUpperCase())}</h2>`,
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
