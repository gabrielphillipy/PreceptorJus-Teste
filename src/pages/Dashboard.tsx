import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { callAI } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyForm, type StudyFormValues } from "@/components/study/StudyForm";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "error"; message: string; lastValues: StudyFormValues };

export default function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTopic = params.get("topic") || "";
  const { saveStudy } = useWorkspace();
  const [view, setView] = useState<ViewState>({ kind: "empty" });

  const handleGenerate = async (values: StudyFormValues) => {
    setView({ kind: "loading" });
    try {
      const text = await callAI({
        mode: values.mode,
        topic: values.topic,
        goals: values.goals,
        sections: values.sections,
      });
      const study = { ...values, text };
      saveStudy({
        id: `study-${Date.now()}`,
        topic: study.topic,
        text: study.text,
        mode: study.mode,
        modeLabel: study.modeLabel,
        favorite: false,
        excerpt: text.replace(/\s+/g, " ").trim().slice(0, 130),
        date: new Date().toLocaleDateString("pt-BR"),
      });
      navigate("/app/study/result", { state: { study } });
    } catch (error: any) {
      setView({ kind: "error", message: error?.message || "Erro ao gerar.", lastValues: values });
    }
  };

  const handleRetry = () => {
    if (view.kind === "error") handleGenerate(view.lastValues);
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
          <StudyForm
            initialTopic={initialTopic}
            loading={view.kind === "loading"}
            onSubmit={handleGenerate}
          />
          {view.kind === "empty" && <EmptyState />}
          {view.kind === "loading" && <LoaderShimmer />}
          {view.kind === "error" && (
            <StudyErrorState message={view.message} onRetry={handleRetry} />
          )}
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

function LoaderShimmer() {
  return (
    <div className="summary">
      <div className="loader">
        <div className="loader__line" />
        <div className="loader__line" />
        <div className="loader__line" />
        <div className="loader__line" />
      </div>
    </div>
  );
}
