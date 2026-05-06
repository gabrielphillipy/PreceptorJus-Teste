const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const DEFAULT_TIMEOUT_MS = 50_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2;
const BASE_BACKOFF_MS = 900;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelCandidates() {
  const primary = (process.env.GEMINI_MODEL || "gemini-2.0-flash-lite").trim();
  const fallbacksRaw = String(process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const models = [
    primary,
    ...fallbacksRaw,
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
  ];
  return [...new Set(models)].filter(Boolean);
}

async function callGeminiWithRetries({ models, prompt, apiKey }) {
  let lastErrorMessage = "";
  let lastStatus = 500;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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
              systemInstruction: {
                parts: [{ text: prompt.instructions }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt.input }],
                },
              ],
              generationConfig: {
                maxOutputTokens: Math.min(Number(prompt.max_output_tokens) || 2048, 8192),
                temperature: 0.45,
                thinkingConfig: {
                  thinkingBudget: 0,
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
          if (text && finishReason !== "MAX_TOKENS") {
            return { data, modelUsed: model };
          }

          lastStatus = 502;
          lastErrorMessage =
            finishReason === "MAX_TOKENS"
              ? "A resposta ficou longa demais e foi interrompida. Tente reduzir secoes ou usar um tema mais especifico."
              : "Resposta vazia do Gemini.";
          if (attempt < MAX_ATTEMPTS) {
            const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
            await sleep(waitMs);
            continue;
          }
        }

        lastStatus = response.status;
        lastErrorMessage = data.error?.message || "Erro ao chamar o Gemini.";

        const isRetryable = RETRYABLE_STATUS.has(response.status);
        if (!isRetryable) {
          break;
        }

        const shouldTryNextModel =
          response.status === 429 ||
          (response.status === 503 && /high demand|overloaded|temporar/i.test(lastErrorMessage));

        if (shouldTryNextModel && modelIndex < models.length - 1) {
          await sleep(BASE_BACKOFF_MS);
          break;
        }

        if (attempt < MAX_ATTEMPTS) {
          const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await sleep(waitMs);
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
          const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await sleep(waitMs);
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  const message =
    lastStatus === 503 && /high demand|overloaded|temporar/i.test(lastErrorMessage)
      ? "A IA esta em alta demanda no momento. Tentamos modelos alternativos, mas o provedor ainda recusou a geracao. Tente novamente em alguns segundos."
      : lastErrorMessage || "Erro ao chamar o Gemini.";

  return { error: message, status: lastStatus };
}

function send(res, status, payload) {
  res.statusCode = status;
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function extractText(response) {
  return (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function buildPrompt(body) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  const goals = Array.isArray(body.goals)
    ? body.goals.map((goal) => String(goal).trim()).filter(Boolean).slice(0, 12)
    : [];
  const selectedSections = Array.isArray(body.sections)
    ? body.sections.map((section) => String(section).trim()).filter(Boolean)
    : [];
  const context = String(body.context || "").trim().slice(0, 6000);

  const base = [
    "Voce e o PreceptorJus, um assistente academico juridico para estudantes brasileiros de Direito, OAB e concursos.",
    "Responda sempre em portugues do Brasil.",
    "Use linguagem tecnica, organizada e didatica.",
    "Nao invente artigos, sumulas ou precedentes. Quando nao tiver certeza, diga para conferir a fonte primaria.",
    "Nao de aconselhamento juridico personalizado; trate como estudo academico.",
  ].join(" ");

  if (body.mode === "chat") {
    return {
      instructions: base,
      input: [
        "Responda como chat de estudo juridico.",
        `Pergunta do estudante: ${String(body.message || "").slice(0, 1500)}`,
        body.context ? `Contexto da tela: ${String(body.context).slice(0, 2500)}` : "",
      ].filter(Boolean).join("\n\n"),
      max_output_tokens: 1200,
    };
  }

  if (body.mode === "exam") {
    return {
      instructions: base,
      input: [
        `Crie um mini-simulado sobre: ${topic}.`,
        context ? `Use este estudo gerado como base principal para a prova:\n${context}` : "",
        "Formato obrigatorio em Markdown:",
        "## Mini-simulado",
        "Enunciado: texto da questao",
        "A) alternativa",
        "B) alternativa",
        "C) alternativa",
        "D) alternativa",
        "**Gabarito:** letra",
        "**Justificativas:**",
        "Justificativa A: justificativa curta (1-3 frases)",
        "Justificativa B: justificativa curta (1-3 frases)",
        "Justificativa C: justificativa curta (1-3 frases)",
        "Justificativa D: justificativa curta (1-3 frases)",
        "Nao revele gabarito ou justificativas no enunciado. Eles devem aparecer apenas nos campos Gabarito e Justificativas.",
      ].filter(Boolean).join("\n"),
      max_output_tokens: 1600,
    };
  }

  if (body.mode === "flashcards") {
    return {
      instructions: base,
      input: [
        `Crie 6 flashcards juridicos sobre: ${topic}.`,
        "Formato obrigatorio:",
        "### Frente",
        "pergunta curta",
        "### Verso",
        "resposta objetiva, com fundamento juridico quando couber.",
      ].join("\n"),
      max_output_tokens: 1600,
    };
  }

  return {
    instructions: base,
    input: [
      `Gere um fechamento academico juridico sobre: ${topic}.`,
      goals.length ? `Objetivos do estudante:\n- ${goals.join("\n- ")}` : "",
      selectedSections.length ? `Secoes desejadas: ${selectedSections.join(", ")}.` : "",
      "Estruture em Markdown com:",
      "## Visao geral",
      "## Fundamentos legais",
      "## Requisitos e excecoes",
      "## Como cai em prova",
      "## Checklist de revisao",
      "Limite cada secao a poucos paragrafos objetivos.",
      "Seja completo, mas evite introducao longa. Va direto ao conteudo.",
      "Inclua alertas de prova e diferencie regra, excecao e controversia quando existir.",
    ].filter(Boolean).join("\n\n"),
    max_output_tokens: 2200,
  };
}

function validateRequest(body) {
  const mode = String(body.mode || "fechamento");
  const topic = String(body.topic || "").trim();

  if (["fechamento", "exam", "flashcards"].includes(mode) && !topic) {
    return {
      status: 400,
      error: "O campo Tema e obrigatorio. Preencha o tema antes de gerar.",
    };
  }

  if (mode === "chat" && !String(body.message || "").trim()) {
    return {
      status: 400,
      error: "Digite uma pergunta antes de enviar ao chat.",
    };
  }

  return null;
}

async function handler(req, res) {

  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST." });
  }

  try {
    const body = await readBody(req);
    const validationError = validateRequest(body);
    if (validationError) {
      return send(res, validationError.status, { error: validationError.error });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return send(res, 500, {
        error: "GOOGLE_API_KEY nao configurada no ambiente da Vercel.",
      });
    }

    const prompt = buildPrompt(body);

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

    return send(res, 200, { text, id: result.data.id, model: result.modelUsed });
  } catch (error) {
    if (error && typeof error === "object" && error.name === "AbortError") {
      return send(res, 504, {
        error:
          "A geracao demorou demais e expirou. Tente novamente (ou gere um resumo menor / reduza secoes).",
      });
    }
    return send(res, 500, {
      error: error instanceof Error ? error.message : "Erro inesperado.",
    });
  }
}

module.exports = handler;
module.exports.config = {
  maxDuration: 60,
};
