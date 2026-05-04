# PreceptorJus

Plataforma de estudos juridicos inspirada no fluxo do Preceptor APG, adaptada para Direito, OAB e concursos.

## Rodar localmente

Abra `index.html` no navegador para ver a interface estatica.

Para testar as rotas de IA localmente, use a CLI da Vercel:

```bash
vercel dev
```

Crie um arquivo `.env` local com:

```bash
GOOGLE_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.5-flash
```

## Deploy na Vercel

Configure as variaveis de ambiente no painel da Vercel:

- `GOOGLE_API_KEY`: chave do Gemini usada pela rota `/api/generate`
- `GEMINI_MODEL`: opcional, por padrao usa `gemini-2.5-flash`

A chave fica somente no servidor e nao e enviada para o navegador.
