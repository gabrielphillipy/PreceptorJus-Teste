/**
 * Parser de markdown gerado pela IA — porta a lógica do legacy/script.js
 * sem o acoplamento de innerHTML.
 *
 * Saída: estrutura tipada que componentes React renderizam.
 */

import { LEGAL_LINE_REGEX } from "@/lib/brand";

export type StudyLineItem =
  | { type: "paragraph"; text: string; legal: boolean }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface StudySectionParsed {
  title: string;
  intro: boolean;
  items: StudyLineItem[];
  rawLines: string[]; // p/ questions/mindmap reparsing
}

export interface StudyMeta {
  topic: string;
  mode?: string;
  modeLabel?: string;
}

export function isMindMapMode(meta: StudyMeta): boolean {
  return /mapa/i.test(meta.mode || "") || /mapa mental/i.test(meta.modeLabel || "");
}

export function isMarkdownDivider(value: string): boolean {
  return /^[-_*]{3,}$/.test(String(value || "").trim());
}

function isDeepeningSection(title: string): boolean {
  return /aprofund|bibliograf|livros|leitura complementar|fontes recomendadas/i.test(title);
}

export function isQuestionSection(title: string): boolean {
  return /quest|fixa|prova|simulado|treino|banca/i.test(title);
}

export function parseStudySections(markdown: string, meta: StudyMeta): StudySectionParsed[] {
  const lines = String(markdown || "").split("\n");
  type Cursor = { title: string; intro: boolean; rawLines: string[] };
  const sections: Cursor[] = [];
  let current: Cursor = { title: meta.topic || "Estudo jurídico", intro: true, rawLines: [] };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      if (current.rawLines.length || !current.intro) sections.push(current);
      current = { title: line.slice(3).trim(), intro: false, rawLines: [] };
      return;
    }
    current.rawLines.push(rawLine);
  });

  if (current.rawLines.length || !sections.length) sections.push(current);

  return sections.map((s) => ({
    ...s,
    items: groupLinesIntoItems(s.rawLines),
  }));
}

/** Agrupa parágrafos, subheadings (### ...), listas e tabelas contíguas. */
function groupLinesIntoItems(rawLines: string[]): StudyLineItem[] {
  const items: StudyLineItem[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[][] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    items.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
  };

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer;
    tableBuffer = [];
    const [headers, ...body] = rows;
    // Tabela só com cabeçalho (geração truncada) → vira parágrafo legível.
    if (body.length === 0) {
      const text = headers.filter(Boolean).join(" · ");
      if (text) items.push({ type: "paragraph", text, legal: LEGAL_LINE_REGEX.test(text) });
      return;
    }
    items.push({ type: "table", headers, rows: body });
  };

  rawLines.forEach((rawLine) => {
    const line = rawLine.trim();

    // ── Tabela markdown ──────────────────────────────────────────
    // Linha separadora (|---|---|) mantém a tabela aberta sem virar linha.
    if (isTableSeparator(line) && (tableBuffer.length || isTableRow(line))) {
      return;
    }
    if (isTableRow(line)) {
      flushList();
      tableBuffer.push(parseTableCells(line));
      return;
    }
    // Qualquer outra linha encerra a tabela em andamento.
    flushTable();

    if (line.startsWith("### ")) {
      flushList();
      items.push({ type: "subheading", text: line.slice(4).trim() });
      return;
    }
    if (!line || isMarkdownDivider(line)) {
      flushList();
      return;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1]);
      return;
    }
    flushList();
    const cleanLine = line.replace(/^\d+\.\s+/, "");
    items.push({
      type: "paragraph",
      text: cleanLine,
      legal: LEGAL_LINE_REGEX.test(cleanLine),
    });
  });
  flushList();
  flushTable();
  return items;
}

/* ───────────────────────────────────────────────────────────── *
 *  Questions parser (sections com title ~ "Questões")
 * ───────────────────────────────────────────────────────────── */

export interface StudyQuestion {
  number: string;
  stem: string[];
  options: { letter: string; text: string }[];
  answer: string;
  comment: string[];
}

export function parseStudyQuestions(rawLines: string[]): StudyQuestion[] {
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const questions: StudyQuestion[] = [];
  let current: StudyQuestion | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.stem.length || current.options.length || current.comment.length) {
      questions.push(current);
    }
    current = null;
  };

  lines.forEach((line) => {
    const clean = line.replace(/\*\*/g, "").trim();
    const questionMatch = clean.match(/^(?:quest[aã]o\s*)?(\d+)[\)\.\:\-]\s*(.+)$/i);
    const headingQuestion = clean.match(/^#+\s*(?:quest[aã]o\s*)?(\d+)[\)\.\:\-]?\s*(.*)$/i);
    const optionMatch = clean.match(/^[-*•]?\s*([A-E])\s*[\)\.\:\-]\s*(.+)$/i);
    const answerMatch = clean.match(/^(?:gabarito|resposta)\s*[:\-]\s*([A-E])(?:\s*[-–—]\s*(.+))?$/i);
    const commentMatch = clean.match(/^(?:coment[aá]rio|justificativa|explica[cç][aã]o)\s*[:\-]\s*(.+)$/i);

    if (questionMatch || headingQuestion) {
      pushCurrent();
      const match = questionMatch || headingQuestion!;
      current = {
        number: match[1],
        stem: match[2] ? [match[2]] : [],
        options: [],
        answer: "",
        comment: [],
      };
      return;
    }

    if (!current) {
      current = { number: String(questions.length + 1), stem: [], options: [], answer: "", comment: [] };
    }
    if (optionMatch) {
      current.options.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2] });
      return;
    }
    if (answerMatch) {
      current.answer = answerMatch[1].toUpperCase();
      if (answerMatch[2]) current.comment.push(answerMatch[2]);
      return;
    }
    if (commentMatch) {
      current.comment.push(commentMatch[1]);
      return;
    }
    if (current.options.length || current.answer || current.comment.length) {
      current.comment.push(clean.replace(/^[-*]\s*/, ""));
    } else {
      current.stem.push(clean.replace(/^[-*]\s*/, ""));
    }
  });

  pushCurrent();
  return questions.filter((q) => q.stem.length || q.options.length);
}

/* ───────────────────────────────────────────────────────────── *
 *  Mind map parser
 * ───────────────────────────────────────────────────────────── */

export interface MindMapPoint {
  short: string;
  full: string;
}

export interface MindMapBranch {
  title: string;
  fullTitle: string;
  points: MindMapPoint[];
  index: number;
}

export interface MindMapModel {
  topic: string;
  centralText: string;
  branches: MindMapBranch[];
}

const BRANCH_FALLBACK_TITLES = ["Conceito", "Base legal", "Requisitos", "Prova", "Exceções", "Revisão"];

function inferBranchTitle(index: number): string {
  return BRANCH_FALLBACK_TITLES[index] || `Ramo ${index + 1}`;
}

/** Palavras funcionais a remover do INÍCIO do título (preposições, artigos, conectores). */
const LEADING_STOP =
  /^(?:o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|no|na|nos|nas|em|este|esta|estes|estas|esse|essa|esses|essas|aquele|aquela|outro|outra|outros|outras|por|para|com|sendo|al[eé]m|tamb[eé]m|tanto|quanto|quando|onde|cujo|cuja)\s+/i;

/** Palavras funcionais a remover do FIM do título (deixa terminar em substantivo/adjetivo). */
const TRAILING_STOP =
  /\s+(?:que|e|ou|de|do|da|dos|das|no|na|nos|nas|em|com|para|por|se|como|[eé]|[àá]|ao|aos|[àá]s|a|o|os|as|um|uma|cujo|cuja|cujos|cujas|qual|quais|onde|sobre|entre|sob|ante|ap[oó]s|at[eé]|desde|sem|ser|est[aá]|s[aã]o|diz|respeito|reside|trata|refere)$/i;

/** Cria um título curto, completo e legível para o card fechado.
 *  - Usa a primeira sentença real (sem quebrar em "Art." / "Lei.")
 *  - Remove preposições/artigos do início e conectores soltos do fim
 *  - Limita a ~50 chars sem "..."
 */
function makeShortTitle(text: string, maxLen = 50): string {
  let clean = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";

  // Tabela "Categoria — descrição": usa a categoria (lado esquerdo) como título.
  if (clean.includes(" — ")) {
    const left = clean.split(" — ")[0].trim();
    if (left.length >= 3 && left.length <= maxLen + 10) return left;
    // lado esquerdo grande demais → cai no fluxo normal de corte por palavra
  }

  // 1) Primeira sentença (respeita abreviações jurídicas)
  const sentence = extractFirstSentence(clean);
  if (sentence && sentence.length >= 10) clean = sentence.replace(/[.!?;:]+$/, "").trim();

  // 2) Remove palavras funcionais do início (repete: "Um dos" → "dos" → "")
  let prev: string;
  do {
    prev = clean;
    clean = clean.replace(LEADING_STOP, "");
  } while (clean !== prev && clean.length > 0);

  // 3) Trunca em quebra natural ou por palavra (sem "...")
  if (clean.length > maxLen) {
    let cutAt = -1;
    const window = clean.slice(0, maxLen + 22);
    for (const sep of [":", ";", ","]) {
      const idx = window.indexOf(sep);
      if (idx > 15 && idx <= maxLen + 8) {
        cutAt = idx;
        break;
      }
    }
    if (cutAt > 0) {
      clean = clean.slice(0, cutAt).trim();
    } else {
      const cut = clean.slice(0, maxLen);
      const lastSpace = cut.lastIndexOf(" ");
      clean = clean.slice(0, lastSpace > maxLen / 2 ? lastSpace : maxLen).trim();
    }
  }

  // 4) Remove conectores soltos do fim ("é a" → "é" → "")
  do {
    prev = clean;
    clean = clean.replace(TRAILING_STOP, "");
  } while (clean !== prev && clean.length > 0);

  // 5) Capitaliza primeira letra
  if (clean) clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  return clean;
}

/** Lista de abreviações jurídicas comuns que terminam em "." mas NÃO indicam fim de sentença. */
const LEGAL_ABBREV = /\b(?:art|arts|lei|leis|dec|decr|cf|cc|cp|cpc|cpp|clt|cdc|ctn|lc|lcp|s[uú]m|inc|incs|par|paragr|caput|n[ºo°]?|[ºª°]|min|sr|sra|dr|dra|prof|exmo|exa)$/i;

/** Extrai a primeira sentença sem quebrar em abreviações como "Art." ou "Lei.". */
function extractFirstSentence(text: string): string {
  const matches = Array.from(text.matchAll(/[.!?;]\s+(?=[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\d])/g));
  for (const m of matches) {
    const before = text.slice(0, m.index!);
    const lastWord = (before.match(/(\S+)$/) || ["", ""])[1].replace(/[.!?;]+$/, "");
    if (!LEGAL_ABBREV.test(lastWord)) {
      return text.slice(0, m.index! + 1).trim();
    }
  }
  return text.trim();
}

function compactMindMapText(value: string, maxLength = 48): string {
  let clean = String(value || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Tenta usar a primeira sentença "real" (sem quebrar em Art. / Lei. / Súm.)
  const firstSentence = extractFirstSentence(clean);
  if (firstSentence && firstSentence.length >= 10) clean = firstSentence;

  if (clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 28 ? lastSpace : maxLength).trim()}…`;
}

function compactBranchTitle(value: string, index: number): string {
  const clean = String(value || "")
    .replace(/^Ramo\s*\d+\s*[:\-]\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
  return compactMindMapText(clean || inferBranchTitle(index), 18);
}

/** Linha separadora de tabela markdown: | :--- | :---: | ---: | */
function isTableSeparator(line: string): boolean {
  return /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(line.trim()) && line.includes("-");
}

/** Linha de dados de tabela markdown: | A | B | C | → "A — B — C" */
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && (t.match(/\|/g) || []).length >= 2;
}

/** Divide uma linha de tabela em células, preservando posição (não filtra vazios). */
function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

/** Rótulos genéricos de cabeçalho de tabela — sem valor informativo. */
const TABLE_HEADER_LABEL =
  /^(?:instituto|institutos|caracter[íi]stica|caracter[íi]sticas|crit[ée]rio|crit[ée]rios|aspecto|aspectos|conceito|item|itens|t[óo]pico|t[óo]picos|coluna|categoria|tipo|tipos|dimens[ãa]o|par[âa]metro|defini[çc][ãa]o|elemento|elementos|compara[çc][ãa]o)\b/i;

function convertTableRow(line: string): string {
  const cells = line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);

  if (cells.length === 0) return "";
  // Descarta linha de cabeçalho (apenas nomes de coluna genéricos)
  if (TABLE_HEADER_LABEL.test(cells[0])) return "";

  return cells.join(" — ");
}

function plainLinesFromRaw(rawLines: string[]): string[] {
  return rawLines
    .map((line) => line.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .filter((line) => !line.startsWith("### ") && !isMarkdownDivider(line))
    .filter((line) => !isTableSeparator(line))
    .map((line) => (isTableRow(line) ? convertTableRow(line) : line))
    .filter(Boolean);
}

/** Limpa um raw line preservando todo o texto (sem truncar). */
function cleanFullText(value: string): string {
  return String(value || "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai pontos de rawLines com versão curta (card) + completa (expansão). */
function extractPointsFromRawLines(rawLines: string[], title: string): MindMapPoint[] {
  const seen = new Set<string>();
  return plainLinesFromRaw(rawLines)
    .map((line) => ({ short: makeShortTitle(line, 50), full: cleanFullText(line) }))
    .filter((p) => {
      const key = p.short.toLowerCase();
      if (!key || seen.has(key) || key === title.toLowerCase()) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

/** Fallback parser: divide o texto bruto em "pseudo-seções" usando ###, **bold**
 *  como título, ou parágrafos consecutivos quando não há cabeçalhos.
 */
function extractPseudoSections(rawLines: string[]): { title: string; lines: string[] }[] {
  const out: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  const flush = () => {
    if (current && current.lines.length) out.push(current);
    current = null;
  };

  rawLines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || isMarkdownDivider(line)) {
      // parágrafo vazio = quebra de seção quando não há cabeçalho
      if (current && !current.title.startsWith("__chunk")) flush();
      return;
    }
    // ### Heading or # Heading
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      current = { title: heading[1].replace(/\*\*/g, "").trim(), lines: [] };
      return;
    }
    // **Bold heading** alone on a line
    const boldHeading = line.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
    if (boldHeading) {
      flush();
      current = { title: boldHeading[1].trim(), lines: [] };
      return;
    }
    if (!current) current = { title: `__chunk${out.length}`, lines: [] };
    current.lines.push(rawLine);
  });
  flush();

  return out;
}

export function buildMindMapModel(sections: StudySectionParsed[], meta: StudyMeta): MindMapModel {
  const topic = meta.topic || "Mapa mental jurídico";
  const central =
    sections.find((s) => /n[uú]cleo|central|tema/i.test(s.title)) || sections[0];
  const centralLines = plainLinesFromRaw(central?.rawLines || []).filter(
    (line) => !/^mapa mental/i.test(line),
  );
  const candidate = compactMindMapText(centralLines[0] || "", 40);
  const centralText = candidate && candidate.length <= 32 ? candidate : compactMindMapText(topic, 32);

  // Strategy 1: ## section-based extraction
  let branchSections = sections.filter((s) => s !== central && plainLinesFromRaw(s.rawLines).length);
  if (branchSections.length < 2) branchSections = sections.filter((s) => s !== central);

  let normalized: MindMapBranch[] = branchSections.slice(0, 6).map((s, index) => {
    const title = compactBranchTitle(s.title || inferBranchTitle(index), index);
    const fullTitle = cleanFullText(s.title || inferBranchTitle(index));
    return { title, fullTitle, points: extractPointsFromRawLines(s.rawLines, title), index };
  });

  // Strategy 2: if no branches with content, try parsing the entire content
  // (every section's rawLines merged) using ###/bold/paragraph heuristics
  const hasContent = normalized.some((b) => b.points.length > 0);
  if (!hasContent) {
    const allRawLines = sections.flatMap((s) =>
      s === central ? s.rawLines : [`## ${s.title}`, ...s.rawLines],
    );
    const pseudo = extractPseudoSections(allRawLines).filter(
      (p) => !p.title.startsWith("__chunk") || p.lines.length >= 2,
    );

    if (pseudo.length >= 2) {
      normalized = pseudo.slice(0, 6).map((p, index) => {
        const isChunk = p.title.startsWith("__chunk");
        const title = isChunk
          ? inferBranchTitle(index)
          : compactBranchTitle(p.title, index);
        const fullTitle = isChunk ? inferBranchTitle(index) : cleanFullText(p.title);
        return { title, fullTitle, points: extractPointsFromRawLines(p.lines, title), index };
      });
    }
  }

  // Strategy 3: last resort — chunk all content into 4 synthetic branches
  const stillEmpty = normalized.length === 0 || normalized.every((b) => b.points.length === 0);
  if (stillEmpty) {
    const fullLines = plainLinesFromRaw(sections.flatMap((s) => s.rawLines)).map((l) => ({
      short: compactMindMapText(l, 64),
      full: cleanFullText(l),
    }));

    if (fullLines.length > 0) {
      const chunkSize = Math.max(2, Math.ceil(fullLines.length / 4));
      const chunks: MindMapPoint[][] = [];
      for (let i = 0; i < fullLines.length && chunks.length < 4; i += chunkSize) {
        chunks.push(fullLines.slice(i, i + chunkSize).slice(0, 3));
      }
      normalized = chunks.map((points, index) => ({
        title: inferBranchTitle(index),
        fullTitle: inferBranchTitle(index),
        points,
        index,
      }));
    }
  }

  // Remove ramos sem conteúdo real (ex.: "Comparativo (se aplicável)" que só
  // virou um rótulo de tabela curto). Um ramo é mantido se tiver >= 2 pontos,
  // ou se seu único ponto tiver >= 5 palavras de conteúdo real.
  const substantial = normalized.filter((b) => {
    if (b.points.length === 0) return false;
    if (b.points.length >= 2) return true;
    const words = (b.points[0].full.match(/\S+/g) || []).length;
    return words >= 5;
  });

  const kept = substantial.length >= 1 ? substantial : normalized;
  const finalBranches = kept.map((b, i) => ({ ...b, index: i }));

  return { topic, centralText, branches: finalBranches };
}

/* ───────────────────────────────────────────────────────────── *
 *  Inline format: legal tokens + bold
 * ───────────────────────────────────────────────────────────── */

import { LEGAL_TOKEN_REGEX } from "@/lib/brand";

/**
 * Recebe markdown inline ("**bold**" + tokens jurídicos) e retorna array
 * de fragmentos para React renderizar de forma segura (sem dangerouslySetInnerHTML).
 */
export interface InlineFragment {
  kind: "text" | "bold" | "mark";
  value: string;
}

export function tokenizeInline(text: string): InlineFragment[] {
  const fragments: InlineFragment[] = [];
  // Pass 1: split por **bold**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  boldParts.forEach((part) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      fragments.push({ kind: "bold", value: part.slice(2, -2) });
      return;
    }
    // Pass 2: extrai tokens jurídicos
    splitByLegalTokens(part).forEach((p) => fragments.push(p));
  });
  return fragments;
}

function splitByLegalTokens(text: string): InlineFragment[] {
  const out: InlineFragment[] = [];
  // Reset lastIndex em regex global
  const regex = new RegExp(LEGAL_TOKEN_REGEX.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    out.push({ kind: "mark", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return out;
}
