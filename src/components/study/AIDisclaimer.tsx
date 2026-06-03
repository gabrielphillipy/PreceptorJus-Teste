import { MI } from "@/components/brand/MaterialIcon";

interface Props {
  variant?: "default" | "compact";
}

/**
 * Banner persistente avisando que o conteúdo é gerado por IA e pode
 * conter erros (artigos, súmulas, jurisprudência). Aparece sempre que
 * um estudo, baralho de flashcards ou simulado é exibido.
 *
 * Não é dispensável de propósito — para um produto jurídico, o aluno
 * precisa ser lembrado a cada interação de que deve conferir a fonte.
 */
export function AIDisclaimer({ variant = "default" }: Props) {
  return (
    <div className={`ai-disclaimer ai-disclaimer--${variant}`} role="note">
      <span className="ai-disclaimer__icon" aria-hidden>
        <MI name="warning" size={variant === "compact" ? 14 : 16} />
      </span>
      <span className="ai-disclaimer__text">
        <strong>Conteúdo gerado por IA.</strong> Sempre confira artigos,
        súmulas e julgados nas <strong>fontes oficiais</strong> (Vade Mecum,
        site do STF/STJ, Diários da Justiça) antes de citar em peça, prova
        ou parecer. A IA pode cometer erros de citação ou inventar
        referências.
      </span>
    </div>
  );
}
