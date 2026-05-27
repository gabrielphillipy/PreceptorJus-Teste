/**
 * Parser do payload de simulado (JSON da IA) — porta a lógica de
 * legacy/script.js (parseExamPayload/extractExamJson/normalizeExamQuestion)
 * para estrutura tipada. React faz o escaping, então sem escapeHtml aqui.
 *
 * Formato esperado da IA (ver api/_lib/legal.js buildExamPrompt):
 * {"questions":[{"statement","options":[{"letter","text"}],"answer","justifications":{}}]}
 */

export interface ExamOption {
  letter: string;
  text: string;
  justification: string;
}

export interface ExamQuestion {
  title: string;
  statement: string;
  options: ExamOption[];
  correctLetter: string;
  comment: string;
}

function extractExamJson(value: string): any {
  const text = String(value || "").trim();
  const withoutFence = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const slice =
    text.indexOf("{") >= 0 ? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1) : "";

  for (const candidate of [text, withoutFence, slice]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

/**
 * Recupera questões individuais de um JSON truncado.
 * Percorre o texto char a char rastreando profundidade de chaves para
 * extrair cada objeto de questão completo, mesmo que o array externo
 * não tenha sido fechado pelo modelo (token limit atingido).
 */
function extractQuestionsFromPartialJson(text: string): any[] {
  const arrayStart = text.search(/"questions"\s*:\s*\[/);
  if (arrayStart < 0) return [];
  const bracketPos = text.indexOf("[", arrayStart);
  if (bracketPos < 0) return [];

  const questions: any[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = bracketPos + 1; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const obj = JSON.parse(text.slice(start, i + 1));
          questions.push(obj);
        } catch { /* objeto incompleto, descarta */ }
        start = -1;
      }
    }
  }
  return questions;
}

function normalizeExamQuestion(question: any, index: number): ExamQuestion {
  const rawOptions = Array.isArray(question?.options) ? question.options : [];
  const rawJust =
    question?.justifications && typeof question.justifications === "object"
      ? question.justifications
      : {};
  const justifications: Record<string, string> = Object.fromEntries(
    Object.entries(rawJust).map(([k, v]) => [String(k).toUpperCase(), String(v ?? "")]),
  );

  const answerText = String(question?.answer || question?.correctLetter || "")
    .trim()
    .toUpperCase();
  const correctLetter = answerText.match(/[A-E]/)?.[0] || "";

  const options: ExamOption[] = rawOptions.map((option: any, optIndex: number) => {
    const data = option && typeof option === "object" ? option : { text: option };
    const letter = String(data.letter || "ABCDE"[optIndex] || "")
      .trim()
      .slice(0, 1)
      .toUpperCase();
    const text = String(data.text || data.content || data.answer || data || "").trim();
    return {
      letter,
      text,
      justification: String(justifications[letter] || data.justification || "").trim(),
    };
  });

  return {
    title: `Questão ${index + 1}`,
    statement: String(question?.statement || question?.enunciado || question?.question || "").trim(),
    options,
    correctLetter,
    comment: String(question?.comment || question?.explanation || "").trim(),
  };
}

/** Retorna as questões válidas (>=2 alternativas e gabarito definido). */
export function parseExamPayload(markdown: string): ExamQuestion[] {
  const json = extractExamJson(markdown);
  if (!json) {
    console.error("[exam-parser] JSON parse failed. len=", markdown.length, "tail=", markdown.slice(-80));
    const partial = extractQuestionsFromPartialJson(markdown);
    if (partial.length) {
      console.warn("[exam-parser] recovered %d questions from partial JSON (null branch)", partial.length);
      return partial
        .map((q: any, i: number) => normalizeExamQuestion(q, i))
        .filter((q: ExamQuestion) => q.options.length >= 2 && q.correctLetter);
    }
    return [];
  }

  // Aceita {"questions":[...]} ou diretamente um array de questões
  const raw: any[] = Array.isArray(json)
    ? json
    : Array.isArray(json.questions)
      ? json.questions
      : Array.isArray(json.questoes)
        ? json.questoes
        : [];

  if (!raw.length) {
    console.error("[exam-parser] no questions array found. keys=", Object.keys(json));
    // Tenta recuperação parcial (JSON truncado por token limit)
    const partial = extractQuestionsFromPartialJson(markdown);
    if (partial.length) {
      console.warn("[exam-parser] recovered %d questions from partial JSON", partial.length);
      return partial
        .map((q: any, i: number) => normalizeExamQuestion(q, i))
        .filter((q: ExamQuestion) => q.options.length >= 2 && q.correctLetter);
    }
    return [];
  }

  const normalized = raw.map((q: any, i: number) => normalizeExamQuestion(q, i));
  console.log("[exam-parser] q[0]=", JSON.stringify(normalized[0]).slice(0, 200));
  const filtered = normalized.filter((q: ExamQuestion) => q.options.length >= 2 && q.correctLetter);
  console.log("[exam-parser] raw=%d normalized=%d filtered=%d", raw.length, normalized.length, filtered.length);
  return filtered;
}
