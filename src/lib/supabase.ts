import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (import.meta.env.DEV && (!url || !anonKey)) {
  console.error(
    '[PreceptorJus] Variáveis de ambiente Supabase ausentes.\n' +
      'Copie .env.example → .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY\n' +
      'com os valores do Supabase Dashboard → Settings → API.',
  )
}

// Tokens de sessão ficam no localStorage (comportamento padrão do SDK para SPAs).
// Decisão: este projeto é uma SPA pura (Vite, sem SSR), portanto cookies httpOnly
// via @supabase/ssr não estão disponíveis — esse pacote exige um framework de SSR
// como Next.js ou SvelteKit. Mitigações implementadas: (1) CSP estrita no vercel.json
// impede leitura via XSS; (2) refresh token rotation limita janela de exploração;
// (3) logout revoga o refresh token no servidor (não apenas apaga localmente).
// Fallback para evitar crash durante inicialização sem env vars
// (o erro real aparece no console acima)
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
)
