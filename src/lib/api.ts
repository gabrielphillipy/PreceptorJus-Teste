/**
 * Wrapper para `/api/generate` e `/api/checkout` (Vercel functions).
 * Mantém o contrato do legacy: prompt + topic + goals + sections, etc.
 */

export type StudyMode = "fechamento" | "mapa" | "peca" | "jurisprudencia" | "questoes";
export type ApiMode = StudyMode | "exam" | "flashcards" | "chat";

export interface GeneratePayload {
  mode: ApiMode;
  topic?: string;
  goals?: string[];
  sections?: string[];
  context?: string;
  message?: string;
  questionCount?: number;
  difficulty?: string;
}

// Server-side OVERALL_TIMEOUT_MS = 55_000 e Vercel maxDuration = 60s.
// O cliente espera um pouco mais que o servidor para receber a mensagem
// de erro real do backend em vez de abortar prematuramente.
const TIMEOUT_MS = 58_000;

export async function callAI(payload: GeneratePayload): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(
        "A geração demorou demais e foi interrompida antes de travar. Tente novamente com um tema mais específico ou menos seções.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível gerar com IA.");
  }
  return data.text || "";
}

/**
 * Variante de `callAI` que consome a resposta em streaming (`stream: true`).
 * Chama `onText` com o texto acumulado a cada pedaço recebido e resolve com
 * o texto final completo. Se o servidor responder JSON (erro), lança Error.
 */
export async function callAIStream(
  payload: GeneratePayload,
  onText: (fullText: string) => void,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, stream: true }),
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      throw new Error(
        "A geração demorou demais e foi interrompida antes de travar. Tente novamente com um tema mais específico ou menos seções.",
      );
    }
    throw error;
  }

  const contentType = response.headers.get("Content-Type") || "";
  // Erro do backend (ou ambiente sem streaming) vem como JSON.
  if (!response.ok || contentType.includes("application/json") || !response.body) {
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({} as any));
    throw new Error(data.error || "Não foi possível gerar com IA.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onText(full);
    }
  } catch (error: any) {
    // Aborto/queda no meio do stream: mantém o que já chegou se for útil.
    if (full.trim().length > 0) return full;
    if (error?.name === "AbortError") {
      throw new Error("A geração demorou demais e foi interrompida.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  return full;
}

export interface CheckoutResponse {
  url?: string;
  error?: string;
}

export async function startCheckout(plan: string): Promise<CheckoutResponse> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  return (await response.json().catch(() => ({}))) as CheckoutResponse;
}

/** Modes humanizados para UI */
export const STUDY_MODES: { value: StudyMode; label: string; icon: string; description: string }[] = [
  {
    value: "fechamento",
    label: "Resumo jurídico completo",
    icon: "description",
    description: "Conceito, base legal, jurisprudência, prova e revisão.",
  },
  {
    value: "mapa",
    label: "Mapa mental",
    icon: "hub",
    description: "Núcleo central + ramos curtos para revisão visual.",
  },
  {
    value: "peca",
    label: "Roteiro de peça prática",
    icon: "edit_document",
    description: "Cabimento, competência, fundamentos e pedidos.",
  },
  {
    value: "jurisprudencia",
    label: "Jurisprudência e teses",
    icon: "gavel",
    description: "Tese central, entendimento dos tribunais, súmulas e divergências.",
  },
  {
    value: "questoes",
    label: "Questões comentadas",
    icon: "quiz",
    description: "Pontos que mais caem, pegadinhas e gabarito comentado.",
  },
];

export const DEFAULT_SECTIONS = [
  "Conceito",
  "Base legal",
  "Jurisprudência",
  "Peça prática",
  "Questões",
];
