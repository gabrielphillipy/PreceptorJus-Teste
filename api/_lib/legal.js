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

// Compact lines, ordered: plan → density → completeness → depth probe → contrast → ABNT-citations → ABNT-references → format.
const STUDY_FINAL_INSTRUCTIONS = [
  "Antes de redigir, identifique mentalmente 3 a 4 pontos do tema com maior peso de prova ou controvérsia, e concentre profundidade neles.",
  "Cada seção deve ter 2 a 4 parágrafos densos. Sem introdução, sem reformular o enunciado. Vá direto.",
  "OBRIGATÓRIO cobrir TODAS as seções listadas com profundidade plena. Não encurte, não resuma, não pule — cada seção deve estar completa, incluindo Comparativo, Aplicação em prova, Para se aprofundar e Referências. Nunca interrompa no meio de uma seção, parágrafo ou tabela.",
  "Para cada conceito central, explique POR QUE existe (finalidade, princípio) e estabeleça conexão com requisitos, exceções ou institutos relacionados.",
  "Quando houver instituto próximo ou divergência relevante, contraste em uma tabela ou em dois parágrafos curtos (uma posição em cada).",
  "Citações no corpo do texto seguem ABNT NBR 10520:2023. Paráfrases: (SOBRENOME, ano). Citação direta curta (até 3 linhas): entre aspas + (SOBRENOME, ano, p. X). Citação direta longa: parágrafo separado, recuado, sem aspas, (SOBRENOME, ano, p. X) ao fim. Autor citado no texto: 'Segundo Sobrenome (ano, p. X), …'. Quatro ou mais autores: 'et al.'. Citação legal: 'art. X da Lei nº Y/ano' ou 'art. X da CF/88'; súmula: 'Súmula nº X do STJ/STF'.",
  "A seção 'Referências' (última, obrigatória) deve seguir ABNT NBR 6023:2018: SOBRENOME em CAIXA-ALTA, título em **negrito**, *In* em itálico, ordenação alfabética. Use os modelos por tipo (livro, capítulo, artigo, Constituição, lei, código, súmula, acórdão). Sem URLs nem datas de acesso. Não invente: marque incertezas com 'verifique a edição mais recente'.",
  "Na seção 'Para se aprofundar': 4 blocos curtos (Doutrina, Legislação, Jurisprudência, Material complementar) com 2 a 3 indicações cada. Sem linhas divisórias '---', sem despedida.",
];

// Per-format generation budgets — drives both maxOutputTokens and Gemini's thinking budget.
// Gemini 2.5 family requires thinking budget to be either 0 (disabled) or >= 512.
const STUDY_BUDGETS = {
  fechamento:     { tokens: 14000, thinking: 1024 },
  mapa:           { tokens: 1400,  thinking: 0 },
  peca:           { tokens: 12000, thinking: 1024 },
  jurisprudencia: { tokens: 14000, thinking: 1024 },
  questoes:       { tokens: 12000, thinking: 1024 },
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

// ─── Seções estruturadas para geração em múltiplas chamadas ──────────
// Cada modo "longo" é gerado seção por seção em chamadas separadas ao
// Gemini, escritas em sequência no mesmo response stream. Isso evita o
// truncamento que acontecia quando o modelo tentava escrever 8 seções
// densas em uma única chamada (estourando tokens ou tempo de função).

// Seção bibliográfica padrão usada no fim dos estudos longos.
// Padrão ABNT NBR 6023:2018 rigoroso, com modelos por tipo de fonte.
const REFERENCIAS_HINT = [
  "Liste de 5 a 8 referências em formato ABNT NBR 6023:2018 RIGOROSO, ordenadas alfabeticamente por sobrenome do autor (ou pelo elemento de entrada da obra coletiva/legislativa). Use bullets ('-').",
  "Convenções: SOBRENOME do autor em CAIXA-ALTA seguido de vírgula e Nome; título da obra em **negrito**; subtítulo após dois-pontos sem negrito; edição apenas a partir da 2ª (formato 'X. ed.'); a palavra 'In' em *itálico*. Termine cada referência com ponto final. Sem URLs nem datas de acesso.",
  "Modelos por tipo (siga literalmente):",
  "- Livro: SOBRENOME, Nome. **Título da obra**: subtítulo. X. ed. Cidade: Editora, ano.",
  "- Capítulo em obra coletiva: SOBRENOME, Nome. Título do capítulo. *In*: SOBRENOME, Nome (org.). **Título da obra**. X. ed. Cidade: Editora, ano. p. X-Y.",
  "- Artigo de periódico: SOBRENOME, Nome. Título do artigo. **Nome do Periódico**, Cidade, v. X, n. Y, p. Z-W, mês/ano.",
  "- Constituição: BRASIL. [Constituição (1988)]. **Constituição da República Federativa do Brasil**. Brasília, DF: Senado Federal, 1988.",
  "- Lei: BRASIL. Lei nº X.XXX, de DD de mês de AAAA. Ementa resumida.",
  "- Código (referência única): BRASIL. **Código [Civil/Penal/de Processo Civil]**. Lei nº X.XXX, de DD de mês de AAAA.",
  "- Súmula: BRASIL. [Tribunal por extenso]. Súmula n. X. Texto da súmula. Cidade: Tribunal, ano.",
  "- Acórdão/julgado: BRASIL. [Tribunal] ([Órgão julgador]). [Tipo de recurso] n. X/UF. Relator: Min. Nome. [Data do julgamento]. **Diário da Justiça Eletrônico**: data de publicação.",
  "Cubra um mix equilibrado: 2 a 3 obras doutrinárias, 2 a 3 dispositivos legais (Constituição, leis, códigos), 1 a 2 súmulas/acórdãos-paradigma.",
  "NÃO invente: cite apenas obras e julgados de existência amplamente conhecida. Se houver dúvida sobre edição, volume ou ano específicos, escreva 'verifique a edição mais recente' em vez de chutar.",
  "Sem despedida, sem comentários antes ou depois da lista, sem linhas divisórias '---'.",
].join("\n");

const FECHAMENTO_SECTIONS = [
  { title: "Conceito, natureza jurídica e finalidade" },
  { title: "Fundamento constitucional e legal (com artigos)" },
  { title: "Elementos, pressupostos ou requisitos" },
  { title: "Hipóteses, exceções e regras especiais" },
  { title: "Controvérsias doutrinárias ou jurisprudenciais atuais" },
  {
    title: "Comparativo com institutos próximos",
    hint: "Use uma tabela markdown comparando o instituto principal com 2 a 4 institutos próximos. Inclua 3 a 5 colunas relevantes (ex.: definição, requisito, fundamento legal, efeito jurídico). Após a tabela, escreva um parágrafo curto explicando a distinção decisiva.",
  },
  { title: "Aplicação em prova e pegadinhas típicas" },
  {
    title: "Para se aprofundar",
    hint: "Estruture em 4 subseções com '### Doutrina', '### Legislação', '### Jurisprudência', '### Material complementar' — cada uma com 2 a 3 indicações em bullets. Sem despedida nem linhas '---'.",
  },
  { title: "Referências", hint: REFERENCIAS_HINT },
];

const PECA_SECTIONS = [
  { title: "Cabimento e fundamento legal" },
  { title: "Competência, partes e legitimidade" },
  { title: "Fundamentos jurídicos (com artigos, súmulas e teses)" },
  { title: "Pedidos (principal, subsidiários e cautelar quando couber)" },
  { title: "Provas e cautelas processuais" },
  { title: "Teses contrárias antecipáveis" },
  { title: "Checklist antes de protocolar", hint: "Liste 5 a 8 itens em bullets curtos e diretos." },
  { title: "Referências", hint: REFERENCIAS_HINT },
];

const JURIS_SECTIONS = [
  { title: "Tese central e contexto" },
  { title: "Posição consolidada dos tribunais (STF/STJ ou tribunal aplicável)" },
  { title: "Súmulas, temas de repercussão geral e julgados-paradigma" },
  { title: "Evolução recente ou mudança de entendimento" },
  { title: "Divergências ou tese contrastante (quando houver)" },
  { title: "Como a banca cobra o tema" },
  {
    title: "Para se aprofundar",
    hint: "Estruture em 4 subseções com '### Doutrina', '### Legislação', '### Jurisprudência', '### Material complementar' — cada uma com 2 a 3 indicações em bullets.",
  },
  { title: "Referências", hint: REFERENCIAS_HINT },
];

const QUESTOES_SECTIONS = [
  { title: "Pontos que mais caem e por quê" },
  { title: "Pegadinhas típicas da banca" },
  {
    title: "Questões modelo",
    hint: "Escreva 3 a 4 questões completas, cada uma com enunciado, 4 alternativas (A-D) e a indicação da alternativa correta. NÃO inclua comentários ainda.",
  },
  {
    title: "Comentários e gabaritos",
    hint: "Para cada questão acima, escreva o gabarito e justifique cada alternativa, citando artigo/súmula/tese quando couber.",
  },
  { title: "Revisão final em bullets", hint: "Liste 5 a 8 pontos-chave de revisão em bullets curtos." },
  { title: "Referências", hint: REFERENCIAS_HINT },
];

const SECTIONS_BY_MODE = {
  fechamento: FECHAMENTO_SECTIONS,
  peca: PECA_SECTIONS,
  jurisprudencia: JURIS_SECTIONS,
  questoes: QUESTOES_SECTIONS,
};

function buildSectionPrompt(body, base, section, allTitles, idx, total) {
  const topic = String(body.topic || "").trim().slice(0, 500);
  const goals = Array.isArray(body.goals)
    ? body.goals.map((g) => String(g).trim()).filter(Boolean).slice(0, 12)
    : [];
  const otherTitles = allTitles.filter((t) => t !== section.title);

  return {
    instructions: base,
    input: [
      `Estudo jurídico aprofundado sobre: ${topic}.`,
      "Audiência: estudante de Direito já familiarizado com vocabulário técnico (OAB 2ª fase / fim de graduação). Foque profundidade e conexões; não explique o básico.",
      goals.length ? `Priorize estes pontos quando relevantes nesta seção:\n- ${goals.join("\n- ")}` : "",
      `Esta é a seção ${idx + 1} de ${total} de um estudo completo. As OUTRAS seções estão sendo escritas em chamadas separadas: ${otherTitles.map((t) => `"${t}"`).join("; ")}. NÃO repita o conteúdo das outras nesta resposta.`,
      `ESCREVA APENAS O CONTEÚDO da seção "${section.title}". Não escreva o título "##" — o sistema já o adicionou antes do seu texto.`,
      section.hint ? `Diretriz específica desta seção: ${section.hint}` : "",
      "Diretrizes gerais:",
      "- 2 a 4 parágrafos densos. Vá direto, sem introdução genérica, sem reformular o tema.",
      "- Explique POR QUE existe (finalidade, princípio) e conecte com requisitos, exceções ou institutos relacionados.",
      "- Citações no corpo do texto seguem ABNT NBR 10520:2023. Paráfrases: (SOBRENOME, ano). Citação direta curta (até 3 linhas): entre aspas + (SOBRENOME, ano, p. X). Citação direta longa (mais de 3 linhas): parágrafo separado, recuado, sem aspas, (SOBRENOME, ano, p. X) ao fim. Autor citado no texto: 'Segundo Sobrenome (ano, p. X), ...'. Dois autores: (SOBRENOME; SOBRENOME, ano); três: idem com três; quatro ou mais: (SOBRENOME et al., ano).",
      "- Citação de dispositivos legais no texto: 'art. X da Lei nº Y/ano' ou 'art. X da CF/88'. Súmulas: 'Súmula nº X do STJ/STF'.",
      "- Cite artigo, súmula, autor ou tese com confiança apenas quando tiver alta certeza. Caso contrário, diga 'verifique no Vade Mecum / site oficial' em vez de omitir.",
      "- Não escreva conclusão, despedida nem linhas divisórias '---'.",
    ].filter(Boolean).join("\n\n"),
    max_output_tokens: 2500,
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

  /** Lista de seções para modos que suportam geração seção-por-seção. */
  sectionsForMode(mode) {
    return SECTIONS_BY_MODE[String(mode || "")] || null;
  },

  /** Constrói o prompt focado para uma única seção. */
  buildSectionPrompt(body, section, allTitles, idx, total) {
    const base = composeBase(this);
    return buildSectionPrompt(body, base, section, allTitles, idx, total);
  },
};

module.exports = { LEGAL_DOMAIN };
