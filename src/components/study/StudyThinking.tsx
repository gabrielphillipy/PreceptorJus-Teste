import { useEffect, useState } from "react";
import { MI } from "@/components/brand/MaterialIcon";

const STEPS = [
  {
    icon: "bolt",
    title: "Conectando ao Preceptor",
    sub: "Validando sessão e contexto",
  },
  {
    icon: "balance",
    title: "Analisando o tema",
    sub: "Buscando legislação e jurisprudência",
  },
  {
    icon: "auto_awesome",
    title: "Escrevendo o conteúdo",
    sub: "Composição da minuta em tempo real",
  },
  {
    icon: "menu_book",
    title: "Finalizando estrutura",
    sub: "Artigos, súmulas e formatação",
  },
];

/** Tempo (ms) até avançar para cada passo seguinte. */
const STEP_DELAYS = [1500, 4200, 8500];

export function StudyThinking() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setActive(i + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="summary study-thinking">
      <div className="study-thinking__head">
        <p className="study-thinking__eyebrow">Gerando agora</p>
        <h2 className="study-thinking__title">
          Preceptor pensando
          <span className="study-thinking__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </h2>
        <p className="study-thinking__sub">
          Geração em streaming. Você verá o texto aparecer em tempo real.
        </p>
      </div>

      <ul className="study-thinking__steps">
        {STEPS.map((step, i) => {
          const state = i < active ? "done" : i === active ? "active" : "pending";
          return (
            <li key={step.title} className={`study-step study-step--${state}`}>
              <span className="study-step__icon">
                <MI name={state === "done" ? "check" : step.icon} size={18} />
              </span>
              <span className="study-step__text">
                <span className="study-step__title">{step.title}</span>
                <span className="study-step__sub">{step.sub}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
