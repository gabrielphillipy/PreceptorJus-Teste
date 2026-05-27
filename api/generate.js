const { send, readBody, checkRateLimit, getActiveDomain } = require("./_lib/utils");

// Timeouts increased to accommodate deeper outputs + thinking budget.
// Vercel maxDuration is 60s (see vercel.json) — keep OVERALL below that minus buffer.
const DEFAULT_TIMEOUT_MS = 50_000;
const OVERALL_TIMEOUT_MS = 55_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 1;
const BASE_BACKOFF_MS = 900;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelCandidates() {
  // gemini-2.0-flash-lite was deprecated for new users in 2025.
  // 2.5-flash-lite is the new cost-efficient default and supports thinking budgets.
  const primary = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
  const fallbacksRaw = String(process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const models = [
    primary,
    ...fallbacksRaw,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ];
  return [...new Set(models)].filter(Boolean);
}

function extractText(response) {
  // Gemini 2.5 includes "thought" parts when thinkingBudget > 0; skip them so they don't
  // appear in the final output (they're internal reasoning, not the answer).
  return (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

async function callGeminiWithRetries({ models, prompt, apiKey }) {
  let lastErrorMessage = "";
  let lastStatus = 500;
  const startedAt = Date.now();

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const remainingMs = OVERALL_TIMEOUT_MS - (Date.now() - startedAt);
      if (remainingMs <= 1500) {
        return {
          error: "A geração demorou demais e foi interrompida antes de travar. Tente novamente com um tema mais específico.",
          status: 504,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(DEFAULT_TIMEOUT_MS, remainingMs - 500));

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: prompt.instructions }] },
              contents: [{ role: "user", parts: [{ text: prompt.input }] }],
              generationConfig: {
                maxOutputTokens: Math.min(Number(prompt.max_output_tokens) || 2048, 8192),
                temperature: 0.55,
                ...(prompt.response_mime_type ? { responseMimeType: prompt.response_mime_type } : {}),
                thinkingConfig: {
                  thinkingBudget: Number.isFinite(prompt.thinking_budget) ? prompt.thinking_budget : 0,
                },
              },
            }),
          },
        );

        const rawText = await response.text();
        const data = rawText ? JSON.parse(rawText) : {};

        if (response.ok) {
          const text = extractText(data);
          const finishReason = data.candidates?.[0]?.finishReason;

          // Gemini 2.5 routinely sets MAX_TOKENS even when the answer is well-formed —
          // the budget is hit right as the model finishes. Accept the response if we
          // have substantial content (>800 chars) regardless of finish reason.
          if (text && text.length > 800) {
            return { data, modelUsed: model };
          }
          if (text && finishReason !== "MAX_TOKENS") {
            return { data, modelUsed: model };
          }

          lastStatus = 502;
          lastErrorMessage =
            finishReason === "MAX_TOKENS"
              ? "A resposta foi cortada antes de iniciar conteúdo útil. Tente um tema mais específico."
              : "Resposta vazia do Gemini.";
          if (attempt < MAX_ATTEMPTS) {
            await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
            continue;
          }
        }

        lastStatus = response.status;
        lastErrorMessage = data.error?.message || "Erro ao chamar o Gemini.";

        if (!RETRYABLE_STATUS.has(response.status)) break;

        const shouldTryNextModel =
          response.status === 429 ||
          (response.status === 503 && /high demand|overloaded|temporar/i.test(lastErrorMessage));

        if (shouldTryNextModel && modelIndex < models.length - 1) {
          await sleep(BASE_BACKOFF_MS);
          break;
        }

        if (attempt < MAX_ATTEMPTS) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
          continue;
        }
      } catch (error) {
        if (error && typeof error === "object" && error.name === "AbortError") {
          lastStatus = 504;
          lastErrorMessage = "Timeout ao aguardar o Gemini.";
        } else if (error instanceof Error) {
          lastStatus = 500;
          lastErrorMessage = error.message || "Erro inesperado ao chamar o Gemini.";
        } else {
          lastStatus = 500;
          lastErrorMessage = "Erro inesperado ao chamar o Gemini.";
        }

        if (attempt < MAX_ATTEMPTS) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  const message =
    lastStatus === 503 && /high demand|overloaded|temporar/i.test(lastErrorMessage)
      ? "A IA está em alta demanda no momento. Tentamos modelos alternativos, mas o provedor ainda recusou a geração. Tente novamente em alguns segundos."
      : lastErrorMessage || "Erro ao chamar o Gemini.";

  return { error: message, status: lastStatus };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST." });
  }

  // Rate limit per IP (in-memory; resets on cold start)
  const limit = checkRateLimit(req, { scope: "generate" });
  if (limit.blocked) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60));
    return send(res, 429, {
      error: `Você atingiu o limite de ${limit.limit} gerações por hora. Tente novamente em cerca de ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
    });
  }

  try {
    const body = await readBody(req);

    const domain = getActiveDomain();
    const validationError = domain.validate(body);
    if (validationError) {
      return send(res, validationError.status, { error: validationError.error });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return send(res, 500, {
        error: "GOOGLE_API_KEY não configurada no ambiente da Vercel.",
      });
    }

    const prompt = domain.buildPrompt(body);
    const models = getModelCandidates();
    const result = await callGeminiWithRetries({
      models,
      prompt,
      apiKey: process.env.GOOGLE_API_KEY,
    });

    if (result && result.error) {
      return send(res, result.status || 503, { error: result.error });
    }

    const text = extractText(result.data);
    if (!text) {
      return send(res, 502, {
        error: "Resposta vazia do provedor de IA. Tente novamente.",
      });
    }

    res.setHeader("X-RateLimit-Limit", String(limit.limit));
    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    const responseBody = { text, id: result.data.id, model: result.modelUsed };
    if (body.mode === "exam") {
      console.log("[exam] model=%s len=%d finish=%s preview=%s",
        result.modelUsed, text.length,
        result.data.candidates?.[0]?.finishReason,
        text.slice(0, 200).replace(/\n/g, " "));
    }
    return send(res, 200, responseBody);
  } catch (error) {
    if (error && typeof error === "object" && error.name === "AbortError") {
      return send(res, 504, {
        error: "A geração demorou demais e expirou. Tente novamente (ou gere um resumo menor / reduza seções).",
      });
    }
    return send(res, 500, {
      error: error instanceof Error ? error.message : "Erro inesperado.",
    });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
