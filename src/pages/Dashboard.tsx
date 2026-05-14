import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { callAI } from "@/lib/api";
import { isMindMapMode } from "@/lib/study-parser";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyForm, type StudyFormValues } from "@/components/study/StudyForm";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { StudyLoader } from "@/components/study/StudyLoader";
import { StudyEmptyState } from "@/components/study/StudyEmptyState";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

interface LastStudy extends StudyFormValues {
  text: string;
}

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "result"; study: LastStudy }
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
      const study: LastStudy = { ...values, text };
      setView({ kind: "result", study });
      // Auto-save igual ao legacy
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
    } catch (error: any) {
      setView({ kind: "error", message: error?.message || "Erro ao gerar.", lastValues: values });
    }
  };

  const handleRetry = () => {
    if (view.kind === "error") handleGenerate(view.lastValues);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <header>
        <Eyebrow>Estudo com IA</Eyebrow>
        <h1 className="font-display text-brand-ink">Gere uma nota jurídica em segundos.</h1>
        <p className="mt-2 max-w-2xl text-brand-ink-2 leading-relaxed">
          Defina tema, modo de estudo e seções. O Preceptor IA organiza fundamentos, artigos e pontos de prova como uma
          minuta de parecer.
        </p>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)] gap-5 items-start">
        {/* Coluna principal: form + result empilhados */}
        <div className="grid gap-5 min-w-0">
          <StudyForm
            initialTopic={initialTopic}
            loading={view.kind === "loading"}
            onSubmit={handleGenerate}
          />

          <ResultZone view={view} onRetry={handleRetry} onGenerateExam={() => {
            if (view.kind === "result") {
              navigate(`/app/exam?topic=${encodeURIComponent(view.study.topic)}`);
            }
          }} />
        </div>

        {/* Coluna lateral: chat */}
        <div className="hidden xl:block">
          <PreceptorChatPanel variant="side" />
        </div>
      </div>
    </div>
  );
}

interface ResultZoneProps {
  view: ViewState;
  onRetry: () => void;
  onGenerateExam: () => void;
}

function ResultZone({ view, onRetry, onGenerateExam }: ResultZoneProps) {
  if (view.kind === "empty") return <StudyEmptyState />;
  if (view.kind === "loading") return <StudyLoader kind="study" />;
  if (view.kind === "error")
    return <StudyErrorState message={view.message} onRetry={onRetry} />;

  // Result
  const { study } = view;
  const useMindMap = isMindMapMode({ mode: study.mode, topic: study.topic, modeLabel: study.modeLabel });

  return (
    <div className="space-y-3">
      <ResultToolbar study={study} onGenerateExam={onGenerateExam} />
      {useMindMap ? (
        <StudyMindMap
          markdown={study.text}
          meta={{ topic: study.topic, mode: study.mode, modeLabel: study.modeLabel }}
        />
      ) : (
        <StudyDocument
          markdown={study.text}
          meta={{ topic: study.topic, mode: study.mode, modeLabel: study.modeLabel }}
        />
      )}
    </div>
  );
}

function ResultToolbar({ study, onGenerateExam }: { study: LastStudy; onGenerateExam: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(study.text);
      setCopied(true);
      toast.success("Estudo copiado.", { duration: 1600 });
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleExport = () => {
    toast("Exportação PDF chega na próxima onda.", { description: "Estamos portando o renderer." });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-ink-2 mr-auto">
        Resultado
      </span>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <MI name={copied ? "check" : "content_copy"} size={16} />
        {copied ? "Copiado" : "Copiar"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        <MI name="picture_as_pdf" size={16} />
        Exportar PDF
      </Button>
      <Button variant="default" size="sm" onClick={onGenerateExam}>
        <MI name="quiz" size={16} />
        Gerar prova
      </Button>
    </div>
  );
}
