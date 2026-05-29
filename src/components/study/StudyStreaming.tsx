import { useEffect, useMemo, useRef, useState } from "react";
import { markdownToHtml } from "@/lib/study-markdown";

const CARET = '<span class="study-streaming__caret"></span>';

/** Insere o cursor DENTRO do último bloco de texto, logo após a última
 *  palavra escrita (em vez de soltá-lo abaixo de todo o conteúdo). */
function withCaret(html: string): string {
  if (!html) return CARET;
  const tags = ["</p>", "</li>", "</h3>", "</h2>", "</td>", "</th>"];
  let lastIdx = -1;
  for (const t of tags) {
    const i = html.lastIndexOf(t);
    if (i > lastIdx) lastIdx = i;
  }
  if (lastIdx === -1) return html + CARET;
  return html.slice(0, lastIdx) + CARET + html.slice(lastIdx);
}

interface Props {
  /** Texto-alvo: cresce conforme os pedaços chegam do streaming. */
  text: string;
  /** Stream terminou — ao acabar de "digitar", dispara onDone. */
  done?: boolean;
  onDone?: () => void;
}

/**
 * Preview ao vivo com efeito de digitação palavra-por-palavra.
 * O texto recebido (que chega em blocos) é revelado de forma suave,
 * como se a IA estivesse escrevendo. Quando alcança o fim e o stream
 * terminou, chama onDone para a tela trocar pelo documento final.
 */
export function StudyStreaming({ text, done = false, onDone }: Props) {
  const [shown, setShown] = useState(0);
  const targetRef = useRef(text);
  targetRef.current = text;
  const firedRef = useRef(false);
  const docRef = useRef<HTMLDivElement>(null);

  // Avança a "digitação" em intervalos fixos, palavra por palavra.
  useEffect(() => {
    const id = setInterval(() => {
      setShown((cur) => {
        const target = targetRef.current;
        if (cur >= target.length) return cur;
        // Quanto mais texto pendente, mais palavras por tick (para alcançar).
        const backlog = target.length - cur;
        const words = backlog > 600 ? 8 : backlog > 200 ? 3 : 1;
        let idx = cur;
        for (let w = 0; w < words && idx < target.length; w++) {
          while (idx < target.length && /\s/.test(target[idx])) idx++;
          while (idx < target.length && !/\s/.test(target[idx])) idx++;
        }
        return idx;
      });
    }, 45);
    return () => clearInterval(id);
  }, []);

  // Terminou de digitar tudo e o stream acabou → conclui.
  useEffect(() => {
    if (done && text.length > 0 && shown >= text.length && !firedRef.current) {
      firedRef.current = true;
      onDone?.();
    }
  }, [done, shown, text, onDone]);

  const visible = text.slice(0, Math.min(shown, text.length));
  const html = useMemo(() => markdownToHtml(visible), [visible]);

  // Mantém o scroll acompanhando o fim do texto.
  useEffect(() => {
    const el = docRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [html]);

  return (
    <div className="summary study-thinking study-streaming">
      <div className="study-thinking__head">
        <p className="study-thinking__eyebrow">Gerando agora</p>
        <h2 className="study-thinking__title">
          Preceptor escrevendo
          <span className="study-thinking__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </h2>
        <p className="study-thinking__sub">
          Geração em streaming. O texto aparece em tempo real conforme a IA escreve.
        </p>
      </div>

      <div
        ref={docRef}
        className="study-interactive__content study-streaming__doc"
        dangerouslySetInnerHTML={{ __html: withCaret(html) }}
      />
    </div>
  );
}
