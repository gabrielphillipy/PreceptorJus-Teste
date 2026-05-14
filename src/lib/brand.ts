/**
 * Brand identity — single source of truth.
 * Trocando este arquivo + tokens em src/index.css, o app vira outro produto.
 */

export const BRAND = {
  name: "PreceptorJus",
  shortMark: "PJ",
  tagline: "Advocacia & estudo jurídico",
  domain: "juridico" as const,
  description:
    "Plataforma de estudo jurídico com IA para Direito, OAB e concursos.",
  url: "https://preceptorjus.vercel.app",
  hero: {
    eyebrow: "Inteligência de estudo para a prática jurídica",
    headline: "Estude Direito com a precisão de um escritório jurídico.",
    body:
      "Fechamentos por matéria, simulados OAB, peças práticas, flashcards e chat de apoio com foco em lei, doutrina, jurisprudência e raciocínio argumentativo.",
  },
  trustRow: ["OAB", "Concursos", "Graduação", "Peças e teses"],
} as const;

export const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "Grátis",
    description: "Para testar fechamentos, flashcards e simulados.",
    cta: "Criar conta",
    featured: false,
  },
  {
    id: "preceptor",
    name: "Preceptor",
    price: "R$ 29",
    period: "/mês",
    description: "Para OAB, faculdade e rotina intensa de revisão.",
    cta: "Assinar agora",
    featured: true,
    badge: "Mais escolhido",
  },
  {
    id: "turmas",
    name: "Turmas",
    price: "Sob consulta",
    description: "Para grupos de estudo, mentores e cursinhos.",
    cta: "Falar com equipe",
    featured: false,
  },
] as const;

/** Highlights em textos (Art. X, STF, STJ, OAB, CF, CPC, CPP, CC, CP) */
export const LEGAL_TOKEN_REGEX =
  /\b(Art\.?\s*\d+[º°]?[A-Z]?[\-A-Z0-9]*|STF|STJ|TST|TSE|TJ|TRF|OAB|CF|CPC|CPP|CC|CP|CLT|CDC|CTN|ECA|LGPD)\b/gi;

/** Heurística para "linha que cita lei" — usado para destacar parágrafos como .pjus-legal */
export const LEGAL_LINE_REGEX =
  /\b(art\.?\s*\d|artigo|c[oó]digo|lei|constitui[cç][aã]o|s[uú]mula|stf|stj|jurisprud[eê]ncia|precedente|tema)\b/i;
