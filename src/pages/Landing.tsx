import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

import { BRAND, PLANS } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow, GoldRule } from "@/components/brand/Eyebrow";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { MI } from "@/components/brand/MaterialIcon";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openApp = () => navigate("/app");

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--pjus-canvas)] texture-grain"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className={cn("glass-nav sticky top-0 z-50 border-b border-slate-200/60", scrolled && "scrolled")}>
        <GoldRule />

        <nav className="flex justify-between items-center w-full px-4 sm:px-6 md:px-10 py-3 sm:py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            <LogoMark size={36} className="transition-transform group-hover:scale-105" />
            <Wordmark showTagline />
          </Link>

          <div className="hidden md:flex items-center divide-x divide-slate-200/60">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-5 text-[13px] font-medium text-brand-ink-2 hover:text-brand-primary-dark transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={openApp}
              className="hidden sm:block px-3 py-2 text-[13px] font-semibold text-brand-ink-2 hover:text-brand-primary-dark transition-colors"
            >
              Entrar
            </button>
            <Button onClick={openApp} className="hidden sm:inline-flex" size="sm">
              Começar
              <span className="text-brand-gold">→</span>
            </Button>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 text-brand-ink-2 hover:text-brand-primary-dark transition-colors -mr-2"
              aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {mobileMenu && (
          <div className="md:hidden border-t border-slate-200/60 bg-white px-4 py-4 space-y-1 animate-fade-in">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenu(false)}
                className="block py-2.5 text-sm font-medium text-brand-ink-2 hover:text-brand-primary-dark"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-200/60 flex gap-2">
              <button
                onClick={openApp}
                className="flex-1 py-2.5 text-sm font-semibold text-brand-primary-dark hover:bg-brand-primary/5 rounded-md transition-colors"
              >
                Entrar
              </button>
              <Button onClick={openApp} className="flex-1" size="sm">
                Começar
                <span className="text-brand-gold">→</span>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <section
          id="inicio"
          className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-10 hero-radial"
        >
          {/* Decorativos: dots no canto + glow gold */}
          <div
            className="absolute -top-10 right-0 w-[28rem] h-[28rem] pointer-events-none texture-dots-subtle"
            style={{
              maskImage: "radial-gradient(ellipse at top right, black 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at top right, black 20%, transparent 75%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-brand-gold/[0.08] blur-3xl pointer-events-none"
            aria-hidden
          />

          <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
            <div className="animate-fade-up">
              <Eyebrow>{BRAND.hero.eyebrow}</Eyebrow>
              <h1 className="font-display text-brand-ink max-w-[18ch]">
                Estude Direito com a precisão de um{" "}
                <em className="not-italic text-[#8a672d]">escritório jurídico</em>.
              </h1>
              <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-brand-ink-2">
                {BRAND.hero.body}
              </p>

              <div className="mt-9 flex flex-wrap gap-3 animate-fade-up-delay-2">
                <Button size="lg" onClick={openApp} className="btn-shimmer">
                  Entrar na plataforma
                  <ArrowRight className="ml-0.5 w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>

              <ul className="mt-10 flex flex-wrap gap-2 animate-fade-up-delay-3" aria-label="Módulos principais">
                {BRAND.trustRow.map((tag) => (
                  <li
                    key={tag}
                    className="px-3 py-1.5 rounded-full border border-[var(--pjus-hairline)] bg-white/70 text-xs font-bold text-brand-ink-2 uppercase tracking-[0.1em] hover:border-brand-gold/40 hover:bg-white transition-colors"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock window — gabinete jurídico */}
            <HeroMock />
          </div>
        </section>

        {/* ─── Como funciona ──────────────────────────────────────── */}
        <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <Eyebrow variant="center">Como funciona</Eyebrow>
              <h2 className="font-display text-brand-ink mt-3">
                Do tema ao argumento, com método de gabinete.
              </h2>
              <p className="mt-4 text-brand-ink-2 leading-relaxed">
                O PreceptorJus organiza estudo jurídico como uma rotina de escritório: problema, fundamento, tese e treino.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  step: "01",
                  title: "Delimite o caso",
                  body: "Informe a matéria, os fatos relevantes ou os objetivos de estudo.",
                  icon: "edit_note",
                },
                {
                  step: "02",
                  title: "Monte a tese",
                  body: "Receba estrutura por fundamentos, artigos, teses, exceções e riscos argumentativos.",
                  icon: "psychology",
                },
                {
                  step: "03",
                  title: "Treine a defesa",
                  body: "Transforme o estudo em simulado, flashcards, roteiro de peça ou conversa com o Preceptor Chat.",
                  icon: "gavel",
                },
              ].map((s, i) => (
                <Card key={s.step} className={cn("card-interactive relative overflow-hidden", `animate-fade-up stagger-${i + 1}`)}>
                  <span
                    className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-gold via-brand-gold/50 to-transparent"
                    aria-hidden
                  />
                  <CardContent className="pt-7 pb-7 pl-8 pr-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className="font-display text-[2rem] font-extrabold text-brand-gold leading-none">{s.step}</span>
                      <MI name={s.icon} size={28} className="text-brand-primary/60" />
                    </div>
                    <h3 className="font-display text-brand-ink text-xl">{s.title}</h3>
                    <p className="mt-2 text-[14px] text-brand-ink-2 leading-relaxed">{s.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Recursos ───────────────────────────────────────────── */}
        <section id="recursos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 bg-[var(--pjus-surface-2)]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-16 items-center">
            <div>
              <Eyebrow>Recursos</Eyebrow>
              <h2 className="font-display text-brand-ink">Uma mesa de trabalho para raciocínio jurídico.</h2>
              <p className="mt-5 text-brand-ink-2 leading-relaxed">
                A experiência inclui menu lateral, gerador de fechamento, biblioteca, simulados e chat jurídico com IA.
                O visual foi pensado como ambiente de estudo de um escritório: limpo, sério e voltado a documentos.
              </p>

              <ul className="mt-7 grid gap-3">
                {[
                  { icon: "verified", text: "Citações com artigo, súmula e tema vinculado" },
                  { icon: "fact_check", text: "Diferencia regra, exceção e controvérsia" },
                  { icon: "menu_book", text: "Sugere bibliografia para se aprofundar" },
                ].map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-[14.5px] text-brand-ink-2 leading-relaxed">
                    <MI name={f.icon} size={20} className="text-brand-primary mt-0.5" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature demo — controle concentrado */}
            <FeatureDemo />
          </div>
        </section>

        {/* ─── Planos ─────────────────────────────────────────────── */}
        <section id="planos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <Eyebrow variant="center">Planos</Eyebrow>
              <h2 className="font-display text-brand-ink mt-3">
                Comece grátis. Assine quando fizer sentido.
              </h2>
              <p className="mt-4 text-brand-ink-2 leading-relaxed">
                Pagamento processado de forma segura. Cancele a hora que quiser.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {PLANS.map((plan, i) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "card-interactive relative flex flex-col",
                    plan.featured && "border-brand-gold/50 shadow-lg",
                    `animate-fade-up stagger-${i + 1}`,
                  )}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-6 inline-flex items-center px-3 py-1 rounded-full bg-brand-gold text-brand-primary-darker text-[11px] font-bold uppercase tracking-[0.12em]">
                      {plan.badge}
                    </span>
                  )}
                  <CardContent className="pt-8 pb-7 px-7 flex flex-col flex-1 gap-4">
                    <h3 className="font-display text-brand-ink text-xl">{plan.name}</h3>
                    <p className="text-[14px] text-brand-ink-2 leading-relaxed min-h-[42px]">
                      {plan.description}
                    </p>
                    <div className="mt-2 mb-3">
                      <span className="font-display font-extrabold text-brand-ink text-[2rem] leading-none">{plan.price}</span>
                      {"period" in plan && plan.period && (
                        <span className="text-brand-ink-2 text-sm font-medium ml-1">{plan.period}</span>
                      )}
                    </div>
                    <Button
                      variant={plan.featured ? "default" : "outline"}
                      onClick={openApp}
                      className="mt-auto w-full"
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--pjus-hairline)] bg-[var(--pjus-surface-2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <div>
              <p className="font-display font-bold text-brand-ink text-sm">{BRAND.name}</p>
              <p className="text-[11px] text-brand-ink-2">© {new Date().getFullYear()} — material acadêmico jurídico.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-brand-ink-2">
            <span className="w-1 h-1 rounded-full bg-brand-gold" aria-hidden />
            <span className="ml-1.5">Confira sempre fontes oficiais — legislação, jurisprudência e súmulas atualizadas.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Mock window — gabinete jurídico (substitui o mock vanilla)
 * ─────────────────────────────────────────────────────────────── */
function HeroMock() {
  return (
    <div className="relative animate-fade-up-delay-1" style={{ perspective: "1400px" }}>
      <div
        className="absolute -inset-x-4 -bottom-8 top-8 rounded-3xl bg-gradient-to-br from-brand-primary/15 to-brand-gold/20 blur-xl"
        aria-hidden
      />
      <div className="pjus-summary relative">
        <div className="pjus-summary__head !pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <span className="ml-auto text-[11px] font-semibold text-brand-ink-2 tracking-wide">
              Parecer · Responsabilidade civil
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr] min-h-[360px]">
          <aside className="bg-[var(--pjus-surface-2)] border-r border-[var(--pjus-hairline)] p-4 space-y-1 text-[12.5px] font-semibold">
            {[
              { label: "Fechamento", active: true },
              { label: "Simulado" },
              { label: "Chat" },
              { label: "Biblioteca" },
            ].map((it) => (
              <div
                key={it.label}
                className={cn(
                  "px-3 py-2 rounded-md transition-colors",
                  it.active
                    ? "bg-brand-gold/15 text-brand-primary-darker"
                    : "text-brand-ink-2/80 hover:bg-white",
                )}
              >
                {it.label}
              </div>
            ))}
          </aside>

          <article className="p-6 lg:p-7">
            <span className="inline-block mb-4 px-2.5 py-1 rounded-md bg-brand-primary-darker text-white text-[10px] font-bold uppercase tracking-[0.12em]">
              Gerado em 14s
            </span>
            <h2 className="font-display text-brand-ink text-[1.45rem] leading-tight">
              Minuta de estudo para tese jurídica
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-brand-ink-2">
              Conduta, dano, nexo causal e regime de imputação. O sistema organiza fundamentos, artigos e pontos de
              contradita para sustentar uma boa argumentação.
            </p>
            <div className="pjus-legal mt-5">
              <strong>Art. 927, CC</strong>
              <p className="text-[13px] text-brand-ink-2 m-0">
                Identifique o dever de reparar e a incidência de responsabilidade objetiva.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Feature demo card — controle concentrado
 * ─────────────────────────────────────────────────────────────── */
function FeatureDemo() {
  return (
    <div className="pjus-summary card-interactive">
      <div className="pjus-summary__head !py-4 !pb-4 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-brand-ink-2 tracking-wide">
          Constitucional · Nota técnica
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-gold/15 text-[#7A5923] text-[10.5px] font-bold uppercase tracking-[0.12em]">
          <MI name="bookmark" size={14} />
          Pronto para revisar
        </span>
      </div>
      <div className="p-7">
        <h3 className="font-display text-brand-ink text-[1.45rem] leading-tight">
          Controle concentrado em peça objetiva
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-brand-ink-2">
          Compare legitimidade, objeto, efeitos da decisão e cautelar. Foque nas diferenças que costumam derrubar
          alternativas em questões objetivas e fundamentar respostas discursivas.
        </p>
        <ul className="mt-5 grid gap-2.5">
          {[
            "Legitimados universais e especiais",
            "Efeito vinculante e eficácia contra todos",
            "Parâmetro constitucional e subsidiariedade",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 px-3.5 py-2.5 rounded-md border border-[var(--pjus-hairline)] bg-[var(--pjus-surface-2)] text-[13.5px] text-brand-ink-2"
            >
              <MI name="check_circle" size={18} className="text-brand-primary mt-px" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
