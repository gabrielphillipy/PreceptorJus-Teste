import { useEffect, useMemo, useRef } from "react";
import { markdownToHtml } from "@/lib/study-markdown";

interface Props {
  text: string;
}

/** Preview ao vivo: renderiza o markdown parcial conforme o texto chega. */
export function StudyStreaming({ text }: Props) {
  const html = useMemo(() => markdownToHtml(text), [text]);
  const docRef = useRef<HTMLDivElement>(null);

  // Mantém o scroll acompanhando o fim do texto que vai sendo escrito.
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
        dangerouslySetInnerHTML={{ __html: `${html}<span class="study-streaming__caret"></span>` }}
      />
    </div>
  );
}
