/**
 * Parser de flashcards — porta parseFlashcards de legacy/script.js.
 * Formato gerado pela IA (ver api/_lib/legal.js buildFlashcardsPrompt):
 *   ### Frente
 *   pergunta
 *   ### Verso
 *   resposta
 *   ---
 */

export interface Flashcard {
  front: string;
  back: string;
}

export function parseFlashcards(markdown: string): Flashcard[] {
  const lines = String(markdown || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  const cards: Flashcard[] = [];
  let side: "" | "front" | "back" = "";
  let front: string[] = [];
  let back: string[] = [];

  const pushCard = () => {
    const frontText = front.join(" ").replace(/^[:\-\s]+/, "").trim();
    const backText = back.join(" ").replace(/^[:\-\s]+/, "").trim();
    if (frontText && backText) cards.push({ front: frontText, back: backText });
    front = [];
    back = [];
    side = "";
  };

  lines.forEach((line) => {
    if (!line || /^-{3,}$/.test(line)) {
      if (front.length && back.length) pushCard();
      return;
    }
    const normalized = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();

    if (/^frente\b/i.test(normalized)) {
      if (front.length && back.length) pushCard();
      side = "front";
      const rest = normalized.replace(/^frente\s*[:\-]?\s*/i, "").trim();
      if (rest) front.push(rest);
      return;
    }
    if (/^verso\b/i.test(normalized)) {
      side = "back";
      const rest = normalized.replace(/^verso\s*[:\-]?\s*/i, "").trim();
      if (rest) back.push(rest);
      return;
    }
    if (side === "front") front.push(line.replace(/^[-*]\s*/, ""));
    if (side === "back") back.push(line.replace(/^[-*]\s*/, ""));
  });

  if (front.length && back.length) pushCard();
  return cards.slice(0, 12);
}
