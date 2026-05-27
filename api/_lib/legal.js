// PreceptorJus — Legal domain config for the AI generator.
// To create PreceptorMed: copy this file to api/_lib/medical.js, export MEDICAL_DOMAIN
// with the same shape, and set PRODUCT_DOMAIN=medical in Vercel env.
//
// NOTE: object keys below (peca, jurisprudencia, questoes, mapa, fechamento, exam,
// flashcards) are ASCII identifiers matched against body.mode — never accent them.
// Only the human-readable prompt strings carry accents.

const TOPIC_REQUIRED_MODES = ["fechamento", "mapa", "peca", "jurisprudencia", "questoes", "exam", "flashcards"];

const STUDY_FORMATS = {
  mapa: [
    "Estruture em Markdown para um mapa mental visual, fluido e direto.",
    "Use obrigatoriamente os títulos com ## abaixo. Não use apenas texto solto.",
    "## Núcleo central",
    "Apenas 2 a 5 palavras com a ideia central.",
    "## Ramo 1: Conceito",
    "- no máximo 6 palavras",
    "- no máximo 6 palavras",
    "## Ramo 2: Base legal",
    "- artigo essencial",
    "- fundamento essencial",
    "## Ramo 3: Requisitos",
    "- requisito em até 6 palavras",
    "- exceção em até 6 palavras",
    "## Ramo 4: Como cai em prova",
    "- pegadinha em até 6 palavras",
    "- distinção em até 6 palavras",
    "Cada ramo deve ter 2 a 3 bullets.",
    "Não escreva parágrafos. Não explique longamente. Não use frases com mais de 8 palavras.",
  ],
  peca: [
    "Estruture em Markdown como roteiro de peça prática:",
    "## Cabimento e fundamento legal",
    "## Competência, partes e legitimidade",
    "## Fundamentos jurídicos (com artigos, súmulas e teses)",
    "## Pedidos (principal, subsidiários e cautelar quando couber)",
    "## Provas e cautelas processuais",
    "## Teses contrárias antecipáveis",
    "## Checklist antes de protocolar",
  ],
  jurisprudencia: [
    "Estruture em Markdown com foco em jurisprudência e teses:",
    "## Tese central e contexto",
    "## Posição consolidada dos tribunais (STF/STJ ou tribunal aplicável)",
    "## Súmulas, temas de repercussão geral e julgados-paradigma",
    "## Evolução recente ou mudança de entendimento",
    "## Divergências ou tese contrastante (quando houver)",
    "## Como a banca cobra o tema",
    "## Para se aprofundar",
  ],
  questoes: [
    "Estruture em Markdown como questões comentadas:",
    "## Pontos que mais caem e por quê",
    "## Pegadinhas típicas da banca",
    "## Questões modelo (3 a 4 questões com enunciado completo)",
    "## Comentários e gabaritos (com artigo/súmula/tese)",
    "## Revisão final em bullets",
  ],
};

const DEFAULT_STUDY_FORMAT = [
  "Estruture em Markdown. Omita uma seção se ela for irrelevante para o tema:",
  "## Conceito, natureza jurídica e finalidade",
  "## Fundamento constitucional e legal (com artigos)",
  "## Elementos, pressupostos ou requisitos",
  "## Hipóteses, exceções e regras especiais",
  "## Controvérsias doutrinárias ou jurisprudenciais atuais",
  "## Comparativo com institutos próximos (se aplicável)",
  "## Aplicação em prova e pegadinhas típicas",
  "## Para se aprofundar",
];

// Six compact lines, ordered: plan → density → depth probe → contrast → precision → format.
const STUDY_FINAL_INSTRUCTIONS = [
  "Antes de redigir, identifique mentalmente 3 a 4 pontos do tema com maior peso de prova ou controvérsia, e concentre profundidade neles.",
  "Cada seção deve ter 2 a 4 parágrafos densos. Sem introdução, sem reformular o enunciado. Vá direto.",
  "Para cada conceito central, explique POR QUE existe (finalidade, princípio) e estabeleça conexão com requisitos, exceções ou institutos relacionados.",
  "Quando houver instituto próximo ou divergência relevante, contraste em uma tabela ou em dois parágrafos curtos (uma posição em cada).",
  "Cite artigo, súmula ou tema com confiança quando tiver alta certeza. Caso contrário, diga 'verifique no Vade Mecum / site oficial' em vez de omitir. Inclua alertas de prova quando aplicável.",
  "Na seção 'Para se aprofundar': 4 blocos curtos (Doutrina, Legislação, Jurisprudência, Material complementar) com 2 a 3 indicações cada. Sem linhas divisórias '---', sem despedida.",
];

// Per-format generation budgets — drives both maxOutputTokens and Gemini's thinking budget.
// Gemini 2.5 family requires thinking budget to be either 0 (disabled) or >= 512.
const STUDY_BUDGETS = {
  fechamento:     { tokens: 3500, thinking: 512 },
  mapa:           { tokens: 1400, thinking: 0 },
  peca:           { tokens: 3000, thinking: 512 },
  jurisprudencia: { tokens: 3500, thinking: 512 },
  questoes:       { tokens: 3200, thinking: 512 },
};

function composeBase(domain) {
  return [
    `Você é o ${domain.persona}, um assistente acadêmico ${domain.subject} para ${domain.audience}.`,
    ...domain.basePrinciples,
  ].join(" ");
}

function buildChatPrompt(body, base) {
  return {
    instructions: base,
    input: [
      "Responda como tira-dúvidas jurídico rápido e independente. Use apenas o que foi escrito nesta mensagem (não assuma referência a estudo anterior).",
      "Se ambígua, responda com a interpretação mais provável e sinalize o ponto a esclarecer.",
      "Quando for conceitual, explique POR QUE e contraste com instituto próximo se relevante. Cite artigo/súmula apenas com alta certeza; senão, oriente onde verificar.",
      "Use tópicos curtos quando ajudar.",
      `Pergunta: ${String(body.message || "").slice(0, 1500)}`,
    ].filter(Boolean).join("\n\n"),
    max_output_tokens: 1100,
    thinking_budget: 0,
  };
}

function buildExamPrompt(body, base) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  const context = String(body.context || "").trim().slice(0, 6000);
  const questionCount = Math.min(Math.max(Number(body.questionCount) || 5, 5), 20);
  const difficulty = String(body.difficulty || "OAB").trim().slice(0, 80);

  return {
    instructions: base,
    input: [
      `Crie um simulado jurídico com ${questionCount} questões sobre: ${topic}. Nível: ${difficulty}.`,
      context ? `Use este estudo como base:\n${context}` : "",
      "Construa questões que diferenciem regra de exceção ou contrastem institutos próximos. Use situação concreta quando o tema permitir.",
      "Cada questão: enunciado, 4 alternativas (A-D), 1 correta, justificativa para CADA alternativa (citando artigo/súmula/tese quando couber).",
      "Distribua entre conceito, base legal, jurisprudência e aplicação prática. Sem gabarito no enunciado.",
      "Responda APENAS JSON válido, sem Markdown nem texto antes/depois.",
      'Formato: {"questions":[{"statement":"...","options":[{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],"answer":"A","justifications":{"A":"...","B":"...","C":"...","D":"..."}}]}',
    ].filter(Boolean).join("\n"),
    max_output_tokens: questionCount > 10 ? 7500 : 6000,
    thinking_budget: 0,
    response_mime_type: "application/json",
  };
}

function buildFlashcardsPrompt(body, base) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  return {
    instructions: base,
    input: [
      `Crie 6 flashcards jurídicos sobre: ${topic}.`,
      "Distribua: 1-2 de conceito, 1-2 de base legal, 1 de jurisprudência/súmula, 1 de pegadinha de prova.",
      "Frente: pergunta curta e específica (evite genérica tipo 'o que é X'). Verso: resposta objetiva com fundamento jurídico quando couber.",
      "Sem introdução. Formato por card:",
      "### Frente",
      "...",
      "### Verso",
      "...",
      "---",
    ].join("\n"),
    max_output_tokens: 1300,
    thinking_budget: 0,
  };
}

function buildStudyPrompt(body, base) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  const goals = Array.isArray(body.goals)
    ? body.goals.map((g) => String(g).trim()).filter(Boolean).slice(0, 12)
    : [];
  const selectedSections = Array.isArray(body.sections)
    ? body.sections.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const mode = String(body.mode || "fechamento");
  const formatLines = STUDY_FORMATS[mode] || DEFAULT_STUDY_FORMAT;
  const budget = STUDY_BUDGETS[mode] || STUDY_BUDGETS.fechamento;
  const isMindMap = mode === "mapa";

  // Mind maps are intentionally terse — skip the depth instructions.
  const finalInstructions = isMindMap ? [] : STUDY_FINAL_INSTRUCTIONS;

  return {
    instructions: base,
    input: [
      `Gere material acadêmico jurídico aprofundado sobre: ${topic}.`,
      "Audiência: estudante de Direito já familiarizado com vocabulário técnico (OAB 2ª fase / fim de graduação). Foque profundidade e conexões; não explique o básico.",
      goals.length ? `Priorize estes pontos:\n- ${goals.join("\n- ")}` : "",
      selectedSections.length ? `Seções desejadas: ${selectedSections.join(", ")}.` : "",
      ...formatLines,
      ...finalInstructions,
    ].filter(Boolean).join("\n\n"),
    max_output_tokens: budget.tokens,
    thinking_budget: budget.thinking,
  };
}

const LEGAL_DOMAIN = {
  id: "legal",
  persona: "PreceptorJus",
  audience: "estudantes brasileiros de Direito, OAB e concursos",
  subject: "jurídico",
  basePrinciples: [
    "Responda sempre em português do Brasil.",
    "Use linguagem técnica, organizada e didática.",
    "Não invente artigos, súmulas ou precedentes. Quando não tiver certeza, diga para conferir a fonte primária.",
    "Não dê aconselhamento jurídico personalizado; trate como estudo acadêmico.",
  ],

  validate(body) {
    const mode = String(body.mode || "fechamento");
    const topic = String(body.topic || "").trim();

    if (TOPIC_REQUIRED_MODES.includes(mode) && !topic) {
      return {
        status: 400,
        error: "O campo Tema é obrigatório. Preencha o tema antes de gerar.",
      };
    }
    if (mode === "chat" && !String(body.message || "").trim()) {
      return {
        status: 400,
        error: "Digite uma pergunta antes de enviar ao chat.",
      };
    }
    return null;
  },

  buildPrompt(body) {
    const base = composeBase(this);
    switch (String(body.mode || "fechamento")) {
      case "chat":
        return buildChatPrompt(body, base);
      case "exam":
        return buildExamPrompt(body, base);
      case "flashcards":
        return buildFlashcardsPrompt(body, base);
      default:
        return buildStudyPrompt(body, base);
    }
  },
};

module.exports = { LEGAL_DOMAIN };
