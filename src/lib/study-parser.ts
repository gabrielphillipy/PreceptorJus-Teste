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
  | { type: "list"; items: string[] };

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

/** Agrupa parágrafos, subheadings (### ...) e listas contíguas. */
function groupLinesIntoItems(rawLines: string[]): StudyLineItem[] {
  const items: StudyLineItem[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    items.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
  };

  rawLines.forEach((rawLine) => {
    const line = rawLine.trim();
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

export interface MindMapBranch {
  title: string;
  points: string[];
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

function compactMindMapText(value: string, maxLength = 48): string {
  let clean = String(value || "")
    .replace(/\*\*/g, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  const colon = clean.indexOf(":");
  if (colon > -1 && colon < 34) {
    const label = clean.slice(0, colon + 1);
    const rest = clean.slice(colon + 1).trim();
    clean = `${label} ${rest.split(/[.;]/)[0] || rest}`;
  } else {
    clean = clean.split(/[.;]/)[0] || clean;
  }

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

function plainLinesFromRaw(rawLines: string[]): string[] {
  return rawLines
    .map((line) => line.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .filter((line) => !line.startsWith("### ") && !isMarkdownDivider(line));
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

  let branches = sections.filter((s) => s !== central && plainLinesFromRaw(s.rawLines).length);
  if (branches.length < 2) branches = sections.filter((s) => s !== central);

  const normalized: MindMapBranch[] = branches.slice(0, 6).map((s, index) => {
    const title = compactBranchTitle(s.title || inferBranchTitle(index), index);
    const seen = new Set<string>();
    const points = plainLinesFromRaw(s.rawLines)
      .map((line) => compactMindMapText(line, 48))
      .filter((line) => {
        const key = line.toLowerCase();
        if (!key || seen.has(key) || key === title.toLowerCase()) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
    return { title, points, index };
  });

  return { topic, centralText, branches: normalized };
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
