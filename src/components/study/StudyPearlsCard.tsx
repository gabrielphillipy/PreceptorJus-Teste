import { MI } from "@/components/brand/MaterialIcon";

const PEARLS = [
  {
    category: "Atenção jurídica",
    text: "Use o chat do Preceptor para extrair teses e aprofundar nos pontos-chave deste resumo.",
  },
  {
    category: "Dica de prova",
    text: "Pergunte quais pontos mais caem em provas e concursos sobre este tema.",
  },
  {
    category: "Peça prática",
    text: "Gere simulações e modelos de peça a partir deste conteúdo para consolidar com active recall.",
  },
];

export function StudyPearlsCard() {
  return (
    <aside className="study-pearls-card">
      <div className="study-pearls-card__head">
        <MI name="diamond" size={16} />
        <span>Pérolas Jurídicas</span>
      </div>
      <div className="study-pearls-card__body">
        {PEARLS.map((p, i) => (
          <div key={i} className="study-pearl">
            <p className="study-pearl__cat">{p.category}</p>
            <p className="study-pearl__text">{p.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
