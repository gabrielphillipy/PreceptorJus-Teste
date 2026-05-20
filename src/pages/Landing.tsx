import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { startCheckout } from "@/lib/api";
import { LogoMark } from "@/components/brand/LogoMark";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";

export default function Landing() {
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);

  const openApp = () => navigate("/app");

  const goCheckout = async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const r = await startCheckout("preceptor");
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      toast("Checkout indisponível", {
        description: r.error || "Tente novamente em instantes.",
      });
    } catch (e: any) {
      toast("Checkout indisponível", { description: e?.message || "Erro de rede." });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      {/* Masthead — newspaper banner */}
      <div className="masthead">
        <div className="masthead__inner">
          <span className="masthead__edition">EDIÇÃO III</span>
          <span className="masthead__dot">●</span>
          <span className="masthead__date">Março · 2025</span>
          <span className="masthead__rule" />
          <span className="masthead__motto">
            <span className="serif italic">Recta ratio</span> · Estudo jurídico orientado a fundamento.
          </span>
        </div>
      </div>

      {/* Sticky nav */}
      <header className="nav">
        <div className="nav__inner">
          <a className="nav__brand" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <LogoMark size={38} />
            <span className="nav__wordmark">
              <span className="nav__name">PreceptorJus</span>
              <span className="nav__tag">Advocacia & estudo jurídico</span>
            </span>
          </a>
          <nav className="nav__links" aria-label="Seções">
            <a href="#rito">Rito do estudo</a>
            <a href="#minuta">Anatomia da minuta</a>
            <a href="#planos">Planos</a>
            <a href="#cabinete">No gabinete</a>
          </nav>
          <div className="nav__actions">
            <button type="button" className="link-quiet" onClick={openApp}>Entrar</button>
            <button type="button" className="btn btn--default" onClick={openApp}>
              Começar
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
        <div className="gold-rule" />
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="eyebrow">Inteligência de estudo para a prática jurídica</p>

              <h1 className="hero__headline">
                <span className="serif italic">Estude Direito</span> com a{" "}
                <span className="hero__headline-em">precisão</span>
                <br />
                de um escritório jurídico.
              </h1>

              <p className="hero__lede">
                Fechamentos por matéria, simulados <em className="term">OAB</em>, peças práticas,
                flashcards e chat de apoio — com foco em <em className="term">lei</em>,{" "}
                <em className="term">doutrina</em>, <em className="term">jurisprudência</em> e
                raciocínio argumentativo.
              </p>

              <div className="hero__ctas">
                <button type="button" className="btn btn--default btn--lg btn-shimmer" onClick={openApp}>
                  Entrar na plataforma
                  <span className="arrow">→</span>
                </button>
                <a href="#rito" className="btn btn--outline btn--lg">Ver como funciona</a>
              </div>

              <ul className="hero__trust" aria-label="Módulos principais">
                <li>OAB</li>
                <li>Concursos</li>
                <li>Graduação</li>
                <li>Peças e teses</li>
              </ul>
            </div>

            {/* Parecer mock */}
            <aside className="hero__mock">
              <div className="mock-shadow" aria-hidden />
              <article className="mock-paper">
                <header className="mock-paper__head">
                  <span className="mock-paper__num">MINUTA Nº PJUS/2025/0042</span>
                  <span className="mock-paper__sep">║</span>
                  <span className="mock-paper__sub">Responsabilidade civil objetiva</span>
                  <span className="mock-paper__time">Gerado em 14s</span>
                </header>

                <div className="mock-paper__body ruled">
                  <h2 className="mock-paper__h">
                    <span className="bar" />
                    Conduta, dano e nexo causal
                  </h2>
                  <p className="mock-paper__lead dropcap-line">
                    <span className="dropcap-letter">A</span> responsabilidade civil objetiva, fundada
                    no <em className="term">Art. 927, par. único, CC</em>, dispensa a investigação de
                    culpa quando a atividade desenvolvida implicar, por sua natureza, risco para os
                    direitos de outrem.
                  </p>

                  <div className="legal">
                    <strong>Art. 927, parágrafo único · CC</strong>
                    <p>
                      Haverá obrigação de reparar o dano, independentemente de culpa, quando a
                      atividade normalmente desenvolvida implicar, por sua natureza, risco para os
                      direitos de outrem.
                    </p>
                  </div>
                </div>

                <footer className="mock-paper__foot">
                  <span>
                    ↳ <em className="term">STJ</em>, Súmula 145 &nbsp;·&nbsp;{" "}
                    <em className="term">STF</em>, Tema 932
                  </span>
                  <span className="mock-paper__sig">— Preceptor IA</span>
                </footer>

                <div className="carimbo carimbo--mock">
                  <span className="carimbo__top">Preceptoria</span>
                  <span className="carimbo__mid">Rubricado</span>
                  <span className="carimbo__bot">PJUS · 2025</span>
                </div>
              </article>
            </aside>
          </div>
        </section>

        {/* RITO DO ESTUDO */}
        <section className="rito" id="rito">
          <div className="rito__inner">
            <header className="section-head">
              <p className="eyebrow center">Rito do estudo</p>
              <h2 className="section-h">
                Do <span className="serif italic">caso</span> ao{" "}
                <span className="serif italic">argumento</span>, com método de gabinete.
              </h2>
              <p className="section-sub">
                PreceptorJus organiza o estudo como uma rotina de escritório: problema, fundamento,
                tese, treino.
              </p>
            </header>

            <ol className="rito__list">
              <li className="rito__step">
                <span className="rito__numeral">I</span>
                <div className="rito__content">
                  <h3>Delimite o caso</h3>
                  <p>
                    Informe matéria, fatos relevantes e objetivos. O Preceptor recebe o tema como uma
                    consulta de balcão.
                  </p>
                  <ul className="rito__detail">
                    <li><span className="col-divider" /> Tema & objetivos</li>
                    <li><span className="col-divider" /> Seções: conceito, base legal, jurisprudência</li>
                    <li><span className="col-divider" /> Modo: fechamento, peça, mapa, discursiva</li>
                  </ul>
                </div>
              </li>

              <li className="rito__step">
                <span className="rito__numeral">II</span>
                <div className="rito__content">
                  <h3>Monte a tese</h3>
                  <p>
                    Receba estrutura por fundamentos, artigos citados, teses dominantes, exceções e
                    riscos argumentativos.
                  </p>
                  <ul className="rito__detail">
                    <li><span className="col-divider" /> Citações com <em className="term">Art.</em>, súmula e tema vinculado</li>
                    <li><span className="col-divider" /> Diferencia regra, exceção e controvérsia</li>
                    <li><span className="col-divider" /> Sugere bibliografia para se aprofundar</li>
                  </ul>
                </div>
              </li>

              <li className="rito__step">
                <span className="rito__numeral">III</span>
                <div className="rito__content">
                  <h3>Treine a defesa</h3>
                  <p>
                    Transforme o estudo em simulado, flashcards SM-2, roteiro de peça ou conversa com
                    o Preceptor Chat.
                  </p>
                  <ul className="rito__detail">
                    <li><span className="col-divider" /> Simulados <em className="term">OAB</em> e concursos</li>
                    <li><span className="col-divider" /> Repetição espaçada para institutos</li>
                    <li><span className="col-divider" /> Chat com remissão ao parecer original</li>
                  </ul>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ANATOMIA DA MINUTA */}
        <section className="anatomy" id="minuta">
          <div className="anatomy__inner">
            <header className="section-head left">
              <p className="eyebrow">Anatomia da minuta</p>
              <h2 className="section-h">
                A nota jurídica gerada como um{" "}
                <span className="serif italic">parecer de gabinete</span>.
              </h2>
              <p className="section-sub">
                Cada estudo segue a estrutura editorial do escritório:{" "}
                <em className="term">cabeçalho</em>, <em className="term">fundamento</em>,{" "}
                <em className="term">tese</em>, <em className="term">prova</em>. Tudo com remissão
                direta à fonte legal.
              </p>
            </header>

            <div className="anatomy__board">
              <div className="anatomy__notes left">
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">A</span>
                  <div>
                    <strong>Cabeçalho protocolar.</strong>
                    <p>Número de minuta, matéria e tempo de geração.</p>
                  </div>
                </div>
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">B</span>
                  <div>
                    <strong>Drop cap editorial.</strong>
                    <p>Primeira letra em Source Serif itálico, sinalizando o início da minuta.</p>
                  </div>
                </div>
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">C</span>
                  <div>
                    <strong>Termos jurídicos em destaque.</strong>
                    <p>
                      Citações como <em className="term">Art. 927</em>, <em className="term">STJ</em>,{" "}
                      <em className="term">CC</em> recebem realce ouro automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <article className="anatomy__doc">
                <header className="anatomy__doc-head">
                  <span className="anatomy__doc-stamp">MINUTA Nº PJUS/2025/0042</span>
                  <span className="anatomy__doc-rule" />
                  <span className="anatomy__doc-area">Direito Civil · Responsabilidade</span>
                </header>

                <h2 className="anatomy__doc-h">
                  <span className="bar" />
                  Responsabilidade civil objetiva
                </h2>

                <div className="anatomy__doc-body ruled">
                  <p className="dropcap-line">
                    <span className="dropcap-letter">D</span>ispõe o{" "}
                    <em className="term">Art. 927, par. único, CC</em> que a obrigação de reparar o
                    dano independe de culpa quando a atividade desenvolvida implicar, por sua natureza,
                    risco para os direitos de outrem.
                  </p>
                  <p>
                    A doutrina contemporânea, em diálogo com <em className="term">STJ</em> Súmula 145,
                    sustenta a chamada <strong>teoria do risco-proveito</strong> como fundamento
                    legitimador.
                  </p>

                  <h3 className="anatomy__doc-sub">
                    <span className="bar gold" /> Pontos de prova
                  </h3>
                  <ul className="anatomy__doc-list">
                    <li>Distinguir <em className="term">objetiva</em> e <em className="term">subjetiva</em></li>
                    <li>Identificar excludentes: caso fortuito, força maior, culpa exclusiva da vítima</li>
                    <li>Aplicabilidade do <em className="term">CDC</em> em relações de consumo</li>
                  </ul>

                  <blockquote className="anatomy__doc-tese">
                    <span className="tese-label">Tese de gabinete</span>
                    Quem cria o risco responde pelo dano. A culpa, quando exigida, é desnecessária se
                    a atividade for, em si, fonte permanente de perigo.
                  </blockquote>
                </div>

                <footer className="anatomy__doc-foot">
                  <span>
                    ↳ Confira sempre fontes oficiais — legislação, jurisprudência e súmulas
                    atualizadas.
                  </span>
                  <span className="anatomy__doc-sig">— Preceptor IA</span>
                </footer>
              </article>

              <div className="anatomy__notes right">
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">D</span>
                  <div>
                    <strong>Hierarquia visual.</strong>
                    <p>
                      Cada seção tem barra ouro à esquerda, hairline abaixo — leitura como sumário de
                      processo.
                    </p>
                  </div>
                </div>
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">E</span>
                  <div>
                    <strong>Pontos de prova.</strong>
                    <p>Lista enxuta de itens que costumam aparecer em prova ou audiência.</p>
                  </div>
                </div>
                <div className="anatomy__note">
                  <span className="anatomy__note-mark">F</span>
                  <div>
                    <strong>Tese de gabinete.</strong>
                    <p>O fechamento argumentativo — formato de aside, prontas para citação.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PULL QUOTE */}
        <section className="quote" id="cabinete">
          <div className="quote__inner">
            <span className="quote__mark" aria-hidden>“</span>
            <blockquote className="quote__body">
              <p>
                O <span className="serif italic">PreceptorJus</span> me deu estrutura. Eu chegava na
                questão da OAB com a tese pronta — não com um <em className="term">resumo</em>{" "}
                genérico, mas com <em className="term">fundamento</em>,{" "}
                <em className="term">súmula</em>, exceção e contrapeso. Senti que estudei como
                advogada, não como aluna.
              </p>
            </blockquote>
            <footer className="quote__cite">
              <span className="quote__name">— Mariana Saldanha</span>
              <span className="quote__divider col-divider" />
              <span className="quote__role">Aprovada · OAB XLI · 1ª chamada</span>
            </footer>
          </div>
        </section>

        {/* PLANOS */}
        <section className="plans" id="planos">
          <div className="plans__inner">
            <header className="section-head center">
              <p className="eyebrow center">Planos</p>
              <h2 className="section-h">
                Comece <span className="serif italic">grátis</span>. Assine quando fizer sentido.
              </h2>
              <p className="section-sub">Pagamento seguro. Cancele a qualquer momento.</p>
            </header>

            <div className="plans__grid">
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
                <button type="button" className="btn btn--outline btn--block" onClick={openApp}>
                  Criar conta
                </button>
              </article>

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
                  onClick={goCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Abrindo checkout…" : "Assinar agora"}
                </button>
              </article>

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

        {/* FAQ */}
        <section className="faq">
          <div className="faq__inner">
            <header className="section-head left">
              <p className="eyebrow">Quesitos frequentes</p>
              <h2 className="section-h">Antes de assinar.</h2>
            </header>

            <div className="faq__list">
              <details className="faq__item" open>
                <summary>
                  <span className="faq__q-num">01</span>
                  <span className="faq__q-text">
                    A IA é confiável para citar artigos e súmulas?
                  </span>
                  <span className="faq__chev">+</span>
                </summary>
                <p>
                  O Preceptor IA cita artigos, súmulas e temas vinculados, mas tratamos cada minuta
                  como <strong>material acadêmico</strong> — o usuário deve confirmar a vigência em
                  fontes oficiais antes de levar a juízo. Para peças reais, mantenha o duplo-cheque
                  com legislação atualizada.
                </p>
              </details>

              <details className="faq__item">
                <summary>
                  <span className="faq__q-num">02</span>
                  <span className="faq__q-text">
                    Posso usar para estudar fora de OAB e Direito?
                  </span>
                  <span className="faq__chev">+</span>
                </summary>
                <p>
                  O foco é jurídico, mas estudantes de concursos públicos com conteúdo de Direito
                  (administrativo, constitucional, tributário) usam os mesmos modos. Para outras
                  carreiras, recomendamos o <em>PreceptorMED</em> ou módulos correlatos.
                </p>
              </details>

              <details className="faq__item">
                <summary>
                  <span className="faq__q-num">03</span>
                  <span className="faq__q-text">Os fechamentos ficam salvos onde?</span>
                  <span className="faq__chev">+</span>
                </summary>
                <p>
                  Tudo na sua <em className="term">Biblioteca</em>, dentro do aplicativo. Você pode
                  favoritar, renomear, exportar PDF ou apagar a qualquer momento. Sem login
                  obrigatório no plano Essencial.
                </p>
              </details>

              <details className="faq__item">
                <summary>
                  <span className="faq__q-num">04</span>
                  <span className="faq__q-text">Cancelo quando?</span>
                  <span className="faq__chev">+</span>
                </summary>
                <p>
                  Plano Preceptor é mensal, sem fidelidade — cancelamento no painel de assinatura, em
                  qualquer momento, com acesso até o fim do ciclo pago.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta">
          <div className="final-cta__inner">
            <p className="eyebrow center gold">Gabinete aberto</p>
            <h2 className="final-cta__h">
              Sua próxima <span className="serif italic">tese</span> começa
              <br />
              com uma boa pergunta.
            </h2>
            <div className="final-cta__row">
              <button
                type="button"
                className="btn btn--gold btn--lg btn-shimmer"
                onClick={openApp}
              >
                Abrir a plataforma
                <span className="arrow">→</span>
              </button>
              <a href="#planos" className="link-quiet final-cta__link">ou conheça os planos</a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="gold-rule" />
        <div className="footer__inner">
          <div className="footer__brand">
            <LogoMark size={36} />
            <div>
              <p className="footer__name">PreceptorJus</p>
              <p className="footer__tag">Advocacia & estudo jurídico</p>
            </div>
          </div>
          <nav className="footer__nav" aria-label="Mapa do site">
            <div>
              <h4>Plataforma</h4>
              <button type="button" onClick={openApp}>Painel</button>
              <button type="button" onClick={() => navigate("/app/study")}>Estudo com IA</button>
              <button type="button" onClick={() => navigate("/app/chat")}>Preceptor Chat</button>
            </div>
            <div>
              <h4>Prática</h4>
              <button type="button" onClick={() => navigate("/app/exam")}>Simulados OAB</button>
              <button type="button" onClick={() => navigate("/app/flashcards")}>Flashcards</button>
              <button type="button" onClick={() => navigate("/app/library")}>Biblioteca</button>
            </div>
            <div>
              <h4>Gabinete</h4>
              <a href="#rito">Como funciona</a>
              <a href="#planos">Planos</a>
              <FeedbackDialog />
            </div>
          </nav>
        </div>
        <div className="footer__bottom">
          <span>© 2025 PreceptorJus · Material acadêmico jurídico.</span>
          <span className="footer__dot">●</span>
          <span>
            Confira sempre fontes oficiais — legislação, jurisprudência e súmulas atualizadas.
          </span>
        </div>
      </footer>
    </>
  );
}
