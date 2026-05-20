import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { callAI } from "@/lib/api";
import { isMindMapMode } from "@/lib/study-parser";
import { exportStudyElementPdf } from "@/lib/pdf-export";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyForm, type StudyFormValues } from "@/components/study/StudyForm";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
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

  const onGenerateExam = () => {
    if (view.kind === "result") {
      navigate(`/app/exam?topic=${encodeURIComponent(view.study.topic)}`);
    }
  };

  const resultRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const onExportPdf = async () => {
    if (view.kind !== "result" || !resultRef.current || exporting) return;
    setExporting(true);
    try {
      await exportStudyElementPdf(resultRef.current, { topic: view.study.topic });
    } catch (err: any) {
      toast.error("Não foi possível gerar o PDF.", { description: err?.message });
    } finally {
      setExporting(false);
    }
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
          <ResultZone
            view={view}
            resultRef={resultRef}
            exporting={exporting}
            onRetry={handleRetry}
            onGenerateExam={onGenerateExam}
            onExportPdf={onExportPdf}
          />
        </div>
        <div>
          <PreceptorChatPanel variant="side" />
        </div>
      </div>
    </div>
  );
}

function ResultZone({
  view,
  resultRef,
  exporting,
  onRetry,
  onGenerateExam,
  onExportPdf,
}: {
  view: ViewState;
  resultRef: React.RefObject<HTMLDivElement>;
  exporting: boolean;
  onRetry: () => void;
  onGenerateExam: () => void;
  onExportPdf: () => void;
}) {
  if (view.kind === "empty") return <EmptyState />;
  if (view.kind === "loading") return <LoaderShimmer />;
  if (view.kind === "error") return <StudyErrorState message={view.message} onRetry={onRetry} />;

  const { study } = view;
  const useMindMap = isMindMapMode({ mode: study.mode, topic: study.topic, modeLabel: study.modeLabel });

  return (
    <div className="stack" style={{ gap: 10 }}>
      <ResultToolbar study={study} exporting={exporting} onGenerateExam={onGenerateExam} onExportPdf={onExportPdf} />
      <div ref={resultRef}>
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
    </div>
  );
}

// Editorial empty state — small card with auto_stories icon.
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

// Editorial 4-line shimmer loader inside .summary chrome.
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

function ResultToolbar({
  study,
  exporting,
  onGenerateExam,
  onExportPdf,
}: {
  study: LastStudy;
  exporting: boolean;
  onGenerateExam: () => void;
  onExportPdf: () => void;
}) {
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

  return (
    <div className="toolbar">
      <span className="toolbar__label">Resultado</span>
      <button type="button" className="btn btn--outline btn--sm" onClick={handleCopy}>
        <MI name={copied ? "check" : "content_copy"} size={16} />
        {copied ? "Copiado" : "Copiar"}
      </button>
      <button type="button" className="btn btn--outline btn--sm" onClick={onExportPdf} disabled={exporting}>
        <MI name="picture_as_pdf" size={16} />
        {exporting ? "Gerando PDF…" : "Exportar PDF"}
      </button>
      <button type="button" className="btn btn--default btn--sm" onClick={onGenerateExam}>
        <MI name="quiz" size={16} />
        Gerar prova
      </button>
    </div>
  );
}
