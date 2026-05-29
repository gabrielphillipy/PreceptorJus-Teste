import { useNavigate, useSearchParams } from "react-router-dom";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyForm, type StudyFormValues } from "@/components/study/StudyForm";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

export default function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTopic = params.get("topic") || "";

  // A geração (com streaming ao vivo) acontece já na tela de resultado:
  // navegamos imediatamente passando os valores do formulário.
  const handleGenerate = (values: StudyFormValues) => {
    navigate("/app/study/result", { state: { generate: values } });
  };

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <Eyebrow>Estudo com IA</Eyebrow>
        <h1>
          Gere uma <span className="serif">nota jurídica</span> em segundos.
        </h1>
        <p>
          Defina tema, modo de estudo e seções. O Preceptor IA organiza fundamentos, artigos e pontos de
          prova como uma minuta de parecer.
        </p>
      </header>

      <div className="grid-study">
        <div className="stack">
          <StudyForm initialTopic={initialTopic} onSubmit={handleGenerate} />
          <EmptyState />
        </div>
        <div>
          <PreceptorChatPanel variant="side" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="card"
      style={{
        padding: 32,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        gap: 8,
        minHeight: 160,
      }}
    >
      <span style={{ color: "rgba(201,168,76,0.85)" }}>
        <MI name="auto_stories" size={28} />
      </span>
      <strong style={{ fontFamily: "var(--font-display)", color: "rgb(var(--brand-ink))" }}>
        Sua nota aparece aqui.
      </strong>
      <span style={{ fontSize: 13, color: "rgb(var(--brand-ink-2))" }}>
        Preencha o tema e gere o estudo.
      </span>
    </div>
  );
}
