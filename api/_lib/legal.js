// PreceptorJus — Legal domain config for the AI generator.
// To create PreceptorMed: copy this file to api/_lib/medical.js, export MEDICAL_DOMAIN
// with the same shape, and set PRODUCT_DOMAIN=medical in Vercel env.

const TOPIC_REQUIRED_MODES = ["fechamento", "mapa", "peca", "jurisprudencia", "questoes", "exam", "flashcards"];

const STUDY_FORMATS = {
  mapa: [
    "Estruture em Markdown para um mapa mental visual, fluido e direto.",
    "Use obrigatoriamente os titulos com ## abaixo. Nao use apenas texto solto.",
    "## Nucleo central",
    "Apenas 2 a 5 palavras com a ideia central.",
    "## Ramo 1: Conceito",
    "- no maximo 6 palavras",
    "- no maximo 6 palavras",
    "## Ramo 2: Base legal",
    "- artigo essencial",
    "- fundamento essencial",
    "## Ramo 3: Requisitos",
    "- requisito em ate 6 palavras",
    "- excecao em ate 6 palavras",
    "## Ramo 4: Como cai em prova",
    "- pegadinha em ate 6 palavras",
    "- distincao em ate 6 palavras",
    "Cada ramo deve ter 2 a 3 bullets.",
    "Nao escreva paragrafos. Nao explique longamente. Nao use frases com mais de 8 palavras.",
  ],
  peca: [
    "Estruture em Markdown como roteiro de peca pratica:",
    "## Cabimento e fundamento legal",
    "## Competencia, partes e legitimidade",
    "## Fundamentos juridicos (com artigos, sumulas e teses)",
    "## Pedidos (principal, subsidiarios e cautelar quando couber)",
    "## Provas e cautelas processuais",
    "## Teses contrarias antecipaveis",
    "## Checklist antes de protocolar",
  ],
  jurisprudencia: [
    "Estruture em Markdown com foco em jurisprudencia e teses:",
    "## Tese central e contexto",
    "## Posicao consolidada dos tribunais (STF/STJ ou tribunal aplicavel)",
    "## Sumulas, temas de repercussao geral e julgados-paradigma",
    "## Evolucao recente ou mudanca de entendimento",
    "## Divergencias ou tese contrastante (quando houver)",
    "## Como a banca cobra o tema",
    "## Para se aprofundar",
  ],
  questoes: [
    "Estruture em Markdown como questoes comentadas:",
    "## Pontos que mais caem e por que",
    "## Pegadinhas tipicas da banca",
    "## Questoes modelo (3 a 4 questoes com enunciado completo)",
    "## Comentarios e gabaritos (com artigo/sumula/tese)",
    "## Revisao final em bullets",
  ],
};

const DEFAULT_STUDY_FORMAT = [
  "Estruture em Markdown. Omita uma secao se ela for irrelevante para o tema:",
  "## Conceito, natureza juridica e finalidade",
  "## Fundamento constitucional e legal (com artigos)",
  "## Elementos, pressupostos ou requisitos",
  "## Hipoteses, excecoes e regras especiais",
  "## Controversias doutrinarias ou jurisprudenciais atuais",
  "## Comparativo com institutos proximos (se aplicavel)",
  "## Aplicacao em prova e pegadinhas tipicas",
  "## Para se aprofundar",
];

// Six compact lines, ordered: plan → density → depth probe → contrast → precision → format.
const STUDY_FINAL_INSTRUCTIONS = [
  "Antes de redigir, identifique mentalmente 3 a 4 pontos do tema com maior peso de prova ou controversia, e concentre profundidade neles.",
  "Cada secao deve ter 2 a 4 paragrafos densos. Sem introducao, sem reformular o enunciado. Va direto.",
  "Para cada conceito central, explique POR QUE existe (finalidade, principio) e estabeleca conexao com requisitos, excecoes ou institutos relacionados.",
  "Quando houver instituto proximo ou divergencia relevante, contraste em uma tabela ou em dois paragrafos curtos (uma posicao em cada).",
  "Cite artigo, sumula ou tema com confianca quando tiver alta certeza. Caso contrario, diga 'verifique no Vade Mecum / site oficial' em vez de omitir. Inclua alertas de prova quando aplicavel.",
  "Na secao 'Para se aprofundar': 4 blocos curtos (Doutrina, Legislacao, Jurisprudencia, Material complementar) com 2 a 3 indicacoes cada. Sem linhas divisorias '---', sem despedida.",
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
    `Voce e o ${domain.persona}, um assistente academico ${domain.subject} para ${domain.audience}.`,
    ...domain.basePrinciples,
  ].join(" ");
}

function buildChatPrompt(body, base) {
  return {
    instructions: base,
    input: [
      "Responda como tira-duvidas juridico rapido e independente. Use apenas o que foi escrito nesta mensagem (nao assuma referencia a estudo anterior).",
      "Se ambigua, responda com a interpretacao mais provavel e sinalize o ponto a esclarecer.",
      "Quando for conceitual, explique POR QUE e contraste com instituto proximo se relevante. Cite artigo/sumula apenas com alta certeza; senao, oriente onde verificar.",
      "Use topicos curtos quando ajudar.",
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
      `Crie um simulado juridico com ${questionCount} questoes sobre: ${topic}. Nivel: ${difficulty}.`,
      context ? `Use este estudo como base:\n${context}` : "",
      "Construa questoes que diferenciem regra de excecao ou contrastem institutos proximos. Use situacao concreta quando o tema permitir.",
      "Cada questao: enunciado, 4 alternativas (A-D), 1 correta, justificativa para CADA alternativa (citando artigo/sumula/tese quando couber).",
      "Distribua entre conceito, base legal, jurisprudencia e aplicacao pratica. Sem gabarito no enunciado.",
      "Responda APENAS JSON valido, sem Markdown nem texto antes/depois.",
      'Formato: {"questions":[{"statement":"...","options":[{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],"answer":"A","justifications":{"A":"...","B":"...","C":"...","D":"..."}}]}',
    ].filter(Boolean).join("\n"),
    max_output_tokens: questionCount > 10 ? 6500 : 3800,
    thinking_budget: 0,
  };
}

function buildFlashcardsPrompt(body, base) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  return {
    instructions: base,
    input: [
      `Crie 6 flashcards juridicos sobre: ${topic}.`,
      "Distribua: 1-2 de conceito, 1-2 de base legal, 1 de jurisprudencia/sumula, 1 de pegadinha de prova.",
      "Frente: pergunta curta e especifica (evite generica tipo 'o que e X'). Verso: resposta objetiva com fundamento juridico quando couber.",
      "Sem introducao. Formato por card:",
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
      `Gere material academico juridico aprofundado sobre: ${topic}.`,
      "Audiencia: estudante de Direito ja familiarizado com vocabulario tecnico (OAB 2a fase / fim de graduacao). Foque profundidade e conexoes; nao explique o basico.",
      goals.length ? `Priorize estes pontos:\n- ${goals.join("\n- ")}` : "",
      selectedSections.length ? `Secoes desejadas: ${selectedSections.join(", ")}.` : "",
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
  subject: "juridico",
  basePrinciples: [
    "Responda sempre em portugues do Brasil.",
    "Use linguagem tecnica, organizada e didatica.",
    "Nao invente artigos, sumulas ou precedentes. Quando nao tiver certeza, diga para conferir a fonte primaria.",
    "Nao de aconselhamento juridico personalizado; trate como estudo academico.",
  ],

  validate(body) {
    const mode = String(body.mode || "fechamento");
    const topic = String(body.topic || "").trim();

    if (TOPIC_REQUIRED_MODES.includes(mode) && !topic) {
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
