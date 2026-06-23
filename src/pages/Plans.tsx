import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { startCheckout } from "@/lib/api";
import { LogoMark } from "@/components/brand/LogoMark";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { useAuthContext } from "@/context/AuthContext";

const PENDING_KEY = "pjus_pending_checkout";

export default function Plans() {
  const navigate = useNavigate();
  const { session, loading } = useAuthContext();
  const [params] = useSearchParams();
  const [checkingOut, setCheckingOut] = useState(false);

  // Dispara o checkout do Stripe (plano Preceptor). Exige login: sem sessão,
  // guarda a intenção e manda pro login; ao voltar logado, retoma sozinho.
  const subscribe = async () => {
    if (checkingOut) return;
    if (!session) {
      sessionStorage.setItem(PENDING_KEY, "preceptor");
      navigate("/login", { state: { from: { pathname: "/planos" } } });
      return;
    }
    setCheckingOut(true);
    try {
      const r = await startCheckout("preceptor", session.user.email ?? undefined);
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      toast("Checkout indisponível", { description: r.error || "Tente novamente em instantes." });
    } catch (e: any) {
      toast("Checkout indisponível", { description: e?.message || "Erro de rede." });
    } finally {
      setCheckingOut(false);
    }
  };

  // Retoma o checkout após o login (intenção guardada antes de redirecionar)
  useEffect(() => {
    if (loading || !session) return;
    if (sessionStorage.getItem(PENDING_KEY) === "preceptor") {
      sessionStorage.removeItem(PENDING_KEY);
      void subscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  // Feedback de checkout cancelado (volta do Stripe)
  useEffect(() => {
    if (params.get("checkout") === "cancelled") {
      toast("Checkout cancelado", { description: "Você pode assinar quando quiser." });
    }
  }, [params]);

  return (
    <>
      {/* Nav simples */}
      <header className="nav">
        <div className="nav__inner">
          <a
            className="nav__brand"
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
          >
            <LogoMark size={38} />
            <span className="nav__wordmark">
              <span className="nav__name">PreceptorJus</span>
              <span className="nav__tag">Advocacia & estudo jurídico</span>
            </span>
          </a>
          <div className="nav__actions">
            <a
              className="link-quiet"
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
            >
              ← Voltar ao site
            </a>
            <button type="button" className="btn btn--default" onClick={() => navigate("/app")}>
              {session ? "Painel" : "Entrar"}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="plans" id="planos" style={{ paddingTop: 48 }}>
          <div className="plans__inner">
            <header className="section-head center">
              <p className="eyebrow center">Planos</p>
              <h2 className="section-h">
                Comece <span className="serif italic">grátis</span>. Assine quando fizer sentido.
              </h2>
              <p className="section-sub">Pagamento seguro via Stripe. Cancele a qualquer momento.</p>
            </header>

            <div className="plans__grid">
              {/* Essencial */}
              <article className="plan">
                <header className="plan__head">
                  <span className="plan__num">I</span>
                  <h3>Essencial</h3>
                </header>
                <div className="plan__price">
                  <span className="plan__amount">Grátis</span>
                </div>
                <p className="plan__desc">Para testar fechamentos, flashcards e simulados curtos.</p>
                <ul className="plan__features">
                  <li><span className="check">✓</span> Até 5 fechamentos / semana</li>
                  <li><span className="check">✓</span> Simulados básicos</li>
                  <li><span className="check">✓</span> Biblioteca pessoal local</li>
                </ul>
                <button
                  type="button"
                  className="btn btn--outline btn--block"
                  onClick={() => navigate(session ? "/app" : "/signup")}
                >
                  {session ? "Ir para o app" : "Criar conta grátis"}
                </button>
              </article>

              {/* Preceptor — pago */}
              <article className="plan plan--featured">
                <span className="plan__badge">Mais escolhido</span>
                <header className="plan__head">
                  <span className="plan__num">II</span>
                  <h3>Preceptor</h3>
                </header>
                <div className="plan__price">
                  <span className="plan__amount">R$&nbsp;29</span>
                  <span className="plan__period">/mês</span>
                </div>
                <p className="plan__desc">Para OAB, faculdade e rotina intensa de revisão.</p>
                <ul className="plan__features">
                  <li><span className="check">✓</span> Fechamentos & simulados ilimitados</li>
                  <li><span className="check">✓</span> Repetição espaçada SM-2</li>
                  <li><span className="check">✓</span> Peças práticas e mapas mentais</li>
                  <li><span className="check">✓</span> Exportação PDF jurídico</li>
                </ul>
                <button
                  type="button"
                  className="btn btn--default btn--block btn-shimmer"
                  onClick={subscribe}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Abrindo checkout…" : session ? "Assinar agora" : "Entrar e assinar"}
                </button>
                {!session && (
                  <p style={{ fontSize: 12, textAlign: "center", marginTop: 8, color: "rgb(var(--brand-ink-2))" }}>
                    É preciso entrar na conta para assinar.
                  </p>
                )}
              </article>

              {/* Turmas — sob consulta */}
              <article className="plan">
                <header className="plan__head">
                  <span className="plan__num">III</span>
                  <h3>Turmas</h3>
                </header>
                <div className="plan__price">
                  <span className="plan__amount">Sob consulta</span>
                </div>
                <p className="plan__desc">
                  Para grupos de estudo, mentores e cursinhos preparatórios.
                </p>
                <ul className="plan__features">
                  <li><span className="check">✓</span> Painel de mentor</li>
                  <li><span className="check">✓</span> Decks compartilhados</li>
                  <li><span className="check">✓</span> Métricas por aluno</li>
                </ul>
                <FeedbackDialog />
              </article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
