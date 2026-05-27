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
  if (!json) return [];

  // Aceita {"questions":[...]} ou diretamente um array de questões
  const raw: any[] = Array.isArray(json)
    ? json
    : Array.isArray(json.questions)
      ? json.questions
      : Array.isArray(json.questoes)
        ? json.questoes
        : [];

  if (!raw.length) return [];

  return raw
    .map((q: any, i: number) => normalizeExamQuestion(q, i))
    .filter((q: ExamQuestion) => q.options.length >= 2 && q.correctLetter);
}
