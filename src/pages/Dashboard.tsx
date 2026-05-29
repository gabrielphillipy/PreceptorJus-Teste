import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { callAI, callAIStream } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyForm, type StudyFormValues } from "@/components/study/StudyForm";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import { StudyThinking } from "@/components/study/StudyThinking";
import { StudyStreaming } from "@/components/study/StudyStreaming";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "streaming"; text: string }
  | { kind: "error"; message: string; lastValues: StudyFormValues };

export default function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTopic = params.get("topic") || "";
  const { saveStudy } = useWorkspace();
  const [view, setView] = useState<ViewState>({ kind: "empty" });

  const finishStudy = (values: StudyFormValues, text: string) => {
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
  };

  const handleGenerate = async (values: StudyFormValues) => {
    setView({ kind: "loading" });
    const payload = {
      mode: values.mode,
      topic: values.topic,
      goals: values.goals,
      sections: values.sections,
    };

    let streamed = "";
    try {
      const text = await callAIStream(payload, (full) => {
        streamed = full;
        setView({ kind: "streaming", text: full });
      });
      finishStudy(values, text || streamed);
    } catch (error: any) {
      // Streaming não chegou a produzir texto → tenta o modo bufferizado.
      if (!streamed.trim()) {
        try {
          const text = await callAI(payload);
          finishStudy(values, text);
          return;
        } catch (fallbackError: any) {
          setView({
            kind: "error",
            message: fallbackError?.message || "Erro ao gerar.",
            lastValues: values,
          });
          return;
        }
      }
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
          {view.kind === "loading" && <StudyThinking />}
          {view.kind === "streaming" && <StudyStreaming text={view.text} />}
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
