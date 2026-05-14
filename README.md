# PreceptorJus v2

Plataforma de estudo jurídico com IA — Direito, OAB, concursos.

> **Esta é a v2 reescrita.** A v1 vanilla (HTML/CSS/JS) está preservada em `legacy/` apenas como referência.

## Stack

Mesma fundação técnica do **PreceptorMed**, para facilitar reuso de componentes e futura integração:

- **Vite 5** + **React 18** + **TypeScript**
- **Tailwind CSS 3** + **shadcn/ui** (Radix + CVA + tailwind-merge)
- **react-router-dom** (lazy routes)
- **sonner** (toasts) · **lucide-react** + **Material Symbols** (ícones)
- **react-hook-form** + **zod** (forms — próximas ondas)
- **react-markdown** + **remark-gfm** (renderização de fechamentos)
- **jspdf** + **html2pdf.js** (exportar PDF — próxima onda)

Backend / API: **Vercel Functions** (`api/generate.js`, `api/checkout.js`) com **Google Gemini** e **Stripe** — mantidas da v1.

## Design system

**Espírito PJ + alma PMed.** Tokens em 4 camadas em [src/index.css](src/index.css):

1. **Brand primitives** (rgb triplets): `--brand-primary: 27 42 65` (navy `#1B2A41`), `--brand-gold: 201 168 76` (`#C9A84C` — alinhado ao PMed).
2. **shadcn semantic** (HSL): `--background`, `--foreground`, `--primary`, `--card`, `--ring`, `--radius`, etc.
3. **pjus extended**: `--pjus-canvas`, `--pjus-shadow-*` (navy-tinted), `--pjus-gradient-sidebar`.
4. **Utilitários `.pjus-*`**: `.pjus-eyebrow`, `.pjus-gold-rule`, `.pjus-summary`, `.pjus-chat`, `.pjus-kpi`, `.pjus-alert`, `.pjus-legal`.

Fontes: **Manrope** (display) · **Inter** (body) · **Source Serif 4** (PDFs jurídicos) · **JetBrains Mono** (mono).

Light-only. Texturas SVG inline (zero Unsplash). Foco visível com `ring brand-primary/55`.

## Rodar localmente

```bash
npm install
npm run dev
```

Servidor em http://localhost:5173.

Para testar as rotas de IA localmente junto com o frontend, use **dois terminais**:

```bash
# terminal 1 — frontend Vite
npm run dev

# terminal 2 — Vercel functions (api/*)
vercel dev
```

Crie um `.env` local com:

```bash
GOOGLE_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.0-flash-lite
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRECEPTOR=price_...
```

## Build

```bash
npm run build       # gera dist/
npm run preview     # serve o build localmente
npm run typecheck   # apenas tipos
```

## Deploy na Vercel

Configure as variáveis de ambiente no painel:

- `GOOGLE_API_KEY` (Gemini)
- `GEMINI_MODEL` (opcional, padrão `gemini-2.0-flash-lite`)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PRECEPTOR`

A Vercel detecta o `framework: vite` em `vercel.json` e faz o build automaticamente. As funções em `api/` continuam serverless.

## Estrutura

```
src/
├── main.tsx                      # entrada
├── App.tsx                       # router (lazy)
├── index.css                     # tokens (4 camadas)
├── lib/
│   ├── utils.ts                  # cn(), slugify, formatDateBR
│   └── brand.ts                  # config da marca + planos + regex
├── components/
│   ├── ui/                       # shadcn primitives (button, card, input...)
│   ├── brand/                    # LogoMark, Eyebrow, MaterialIcon
│   └── layout/AppLayout.tsx      # sidebar gradient navy + topbar
└── pages/
    ├── Landing.tsx               # PROVA DE CONCEITO do design system
    └── AppShell.tsx              # placeholder do app (próxima onda)

api/                              # Vercel functions (mantidas)
legacy/                           # v1 vanilla preservada para referência
```

## Próximas ondas

A v2 nesta sessão entrega:

✅ Fundação (Vite + TS + Tailwind + shadcn)
✅ Tokens, layout, brand
✅ Landing completa

**Próximas sessões migram:**

- [ ] `Dashboard.tsx` — gerar estudo jurídico (com .pjus-summary)
- [ ] `Exam.tsx` — simulado interativo
- [ ] `Flashcards.tsx` — deck com flip
- [ ] `Library.tsx` — biblioteca + busca + filtros
- [ ] `Chat.tsx` — Preceptor Chat
- [ ] `Pricing.tsx` + `ThankYou.tsx` — checkout
- [ ] PDF renderer (extraído do `legacy/script.js`)
- [ ] Auth real (Supabase) — opcional, hoje é client-only
