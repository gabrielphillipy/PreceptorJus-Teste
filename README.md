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
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-5.5
```

## Deploy na Vercel

Configure as variaveis de ambiente no painel da Vercel:

- `OPENAI_API_KEY`: chave da OpenAI usada pela rota `/api/generate`
- `OPENAI_MODEL`: opcional, por padrao usa `gpt-5.5`

A chave fica somente no servidor e nao e enviada para o navegador.
