const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

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
  const topic = String(body.topic || "tema juridico").slice(0, 500);
  const goals = Array.isArray(body.goals)
    ? body.goals.map((goal) => String(goal).trim()).filter(Boolean).slice(0, 12)
    : [];
  const selectedSections = Array.isArray(body.sections)
    ? body.sections.map((section) => String(section).trim()).filter(Boolean)
    : [];

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
      max_output_tokens: 900,
    };
  }

  if (body.mode === "exam") {
    return {
      instructions: base,
      input: [
        `Crie um mini-simulado sobre: ${topic}.`,
        "Formato obrigatorio em Markdown:",
        "## Mini-simulado",
        "1. Enunciado da questao",
        "A) alternativa",
        "B) alternativa",
        "C) alternativa",
        "D) alternativa",
        "**Gabarito:** letra",
        "**Comentario:** explique a resposta e a pegadinha.",
      ].join("\n"),
      max_output_tokens: 1100,
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
      max_output_tokens: 1200,
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
      "## Doutrina e jurisprudencia em linguagem segura",
      "## Como cai em prova",
      "## Checklist de revisao",
      "Inclua alertas de prova e diferencie regra, excecao e controversia quando existir.",
    ].filter(Boolean).join("\n\n"),
    max_output_tokens: 1800,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST." });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return send(res, 500, {
      error: "GOOGLE_API_KEY nao configurada no ambiente da Vercel.",
    });
  }

  try {
    const body = await readBody(req);
    const prompt = buildPrompt(body);
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_API_KEY,
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
          maxOutputTokens: prompt.max_output_tokens,
          temperature: 0.45,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return send(res, response.status, {
        error: data.error?.message || "Erro ao chamar o Gemini.",
      });
    }

    return send(res, 200, { text: extractText(data), id: data.id });
  } catch (error) {
    return send(res, 500, {
      error: error instanceof Error ? error.message : "Erro inesperado.",
    });
  }
};
