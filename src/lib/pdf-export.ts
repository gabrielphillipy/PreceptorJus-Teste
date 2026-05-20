/**
 * PDF export via html2pdf.js — renderiza a DOM já estilizada para canvas e
 * empacota em PDF A4. Mantém fidelidade visual ao design editorial sem
 * reescrever layout em jsPDF primitivo.
 *
 * html2pdf é carregado por dynamic import — não entra no bundle inicial.
 */

import type { Flashcard } from "@/lib/flashcard-parser";

function slugify(s: string): string {
  // Remove combining diacritical marks (U+0300..U+036F) after NFD-normalizing.
  const noAccents = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return noAccents.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "documento";
}

async function loadHtml2Pdf(): Promise<any> {
  const mod: any = await import("html2pdf.js");
  return mod.default || mod;
}

interface PdfBaseOpts {
  filename: string;
}

const COMMON_OPTS = (filename: string) => ({
  margin: [8, 8, 10, 8],
  filename,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    letterRendering: true,
    windowWidth: 820,
  },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  pagebreak: { mode: ["css", "legacy"] },
});

/**
 * Exporta um estudo (StudyDocument ou StudyMindMap) já renderizado na DOM.
 * Recebe o elemento referenciado pelo componente React.
 */
export async function exportStudyElementPdf(
  el: HTMLElement,
  meta: { topic: string },
): Promise<void> {
  const html2pdf = await loadHtml2Pdf();
  const filename = `${slugify(meta.topic || "preceptorjus-estudo")}.pdf`;
  await html2pdf().set(COMMON_OPTS(filename)).from(el).save();
}

/**
 * Exporta o baralho completo de flashcards num layout printable
 * (não usa o deck interativo — gera grid de cards frente/verso).
 */
export async function exportFlashcardsPdf(
  cards: Flashcard[],
  topic: string,
): Promise<void> {
  if (!cards.length) return;
  const html2pdf = await loadHtml2Pdf();
  const filename = `${slugify(topic || "preceptorjus-flashcards")}-flashcards.pdf`;

  // Montagem do layout printable em DOM destacada (offscreen)
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:800px;background:#fff;font-family:var(--font-body);padding:24px;color:#141923;";

  const cover = document.createElement("section");
  cover.style.cssText =
    "border-bottom:1px solid #e7e8e9;padding-bottom:20px;margin-bottom:24px;";
  cover.innerHTML = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#A8862E;margin:0 0 8px">
      Baralho jurídico · PreceptorJus
    </p>
    <h1 style="font-family:var(--font-display);font-size:28px;font-weight:800;letter-spacing:-0.025em;color:#141923;margin:0 0 6px">
      ${escapeHtml(topic)}
    </h1>
    <p style="font-family:var(--font-mono);font-size:11px;color:#6e7376;margin:0">
      ${cards.length} flashcards · gerado em ${new Date().toLocaleDateString("pt-BR")}
    </p>
  `;
  wrapper.appendChild(cover);

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:14px;";
  cards.forEach((card, i) => {
    const cardEl = document.createElement("article");
    cardEl.style.cssText =
      "border:1px solid #e7e8e9;border-radius:12px;padding:18px;page-break-inside:avoid;background:#fafbfa";
    cardEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:#6e7376;margin-bottom:10px;letter-spacing:0.04em">
        <span>Card ${i + 1}</span>
        <span>${escapeHtml(topic)}</span>
      </div>
      <p style="font-family:var(--font-display);font-weight:700;font-size:14px;color:#141923;margin:0 0 10px;line-height:1.3">
        ${escapeHtml(card.front)}
      </p>
      <div style="border-top:1px dashed #e7e8e9;padding-top:10px;font-size:12.5px;line-height:1.55;color:#3D4654">
        ${escapeHtml(card.back)}
      </div>
    `;
    grid.appendChild(cardEl);
  });
  wrapper.appendChild(grid);

  document.body.appendChild(wrapper);
  try {
    await html2pdf().set(COMMON_OPTS(filename)).from(wrapper).save();
  } finally {
    wrapper.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type { PdfBaseOpts };
