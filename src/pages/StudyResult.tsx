import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { exportStudyElementPdf } from "@/lib/pdf-export";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyInteractive } from "@/components/study/StudyInteractive";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { StudyChatDrawer } from "@/components/study/StudyChatDrawer";
import { StudyPearlsCard } from "@/components/study/StudyPearlsCard";

interface StudyData {
  topic: string;
  mode: string;
  modeLabel: string;
  goals?: string;
  sections?: string[];
  text: string;
}

const STORAGE_KEY = "pjus_last_study";

function estimateReadTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return minutes < 2 ? "~1 min de leitura" : `~${minutes} min de leitura`;
}

function loadSaved(): StudyData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudyData) : null;
  } catch {
    return null;
  }
}

export default function StudyResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeStudy = location.state?.study as StudyData | undefined;
  const study = routeStudy ?? loadSaved();

  const resultRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const initialTab = routeStudy?.mode === "mapa" ? "mapa" : "documento";
  const [tab, setTab] = useState<"documento" | "interativo" | "mapa">(initialTab);

  useEffect(() => {
    if (routeStudy) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(routeStudy)); } catch {}
    }
  }, [routeStudy]);

  useEffect(() => {
    if (!study) navigate("/app/study", { replace: true });
  }, [study, navigate]);

  if (!study) return null;

  const showSidebar = tab === "interativo";

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

  const handleExportPdf = async () => {
    if (!resultRef.current || exporting) return;
    setExporting(true);
    try {
      await exportStudyElementPdf(resultRef.current, { topic: study.topic });
    } catch (err: any) {
      toast.error("Não foi possível gerar o PDF.", { description: err?.message });
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateExam = () => {
    navigate(`/app/exam?topic=${encodeURIComponent(study.topic)}`);
  };

  return (
    <div className="study-result-page fade-up">
      {/* Tab bar sticky */}
      <div className="study-tabbar">
        <div className="study-tabbar__tabs">
          <button
            type="button"
            className="study-tab study-tab--back"
            onClick={() => navigate("/app/study")}
          >
            <MI name="arrow_back" size={15} />
            <span className="study-tab__label">Novo estudo</span>
          </button>
          <button
            type="button"
            className={`study-tab ${tab === "interativo" ? "study-tab--active" : ""}`}
            onClick={() => setTab("interativo")}
          >
            <MI name="auto_awesome" size={15} />
            <span>Estudo Interativo</span>
          </button>
          <button
            type="button"
            className={`study-tab ${tab === "documento" ? "study-tab--active" : ""}`}
            onClick={() => setTab("documento")}
          >
            <MI name="description" size={15} />
            <span>Documento</span>
          </button>
          <button
            type="button"
            className={`study-tab ${tab === "mapa" ? "study-tab--active" : ""}`}
            onClick={() => setTab("mapa")}
          >
            <MI name="account_tree" size={15} />
            <span>Mapa Mental</span>
          </button>
        </div>
        <div className="study-tabbar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy}>
            <MI name={copied ? "check" : "content_copy"} size={15} />
            <span className="study-tab__label">{copied ? "Copiado" : "Copiar"}</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <MI name="picture_as_pdf" size={15} />
            <span className="study-tab__label">{exporting ? "Gerando…" : "PDF"}</span>
          </button>
          <button type="button" className="btn btn--default btn--sm" onClick={handleGenerateExam}>
            <MI name="quiz" size={15} />
            <span className="study-tab__label">Gerar prova</span>
          </button>
        </div>
      </div>

      {/* Content layout — duas colunas no Estudo Interativo */}
      <div className={`study-result-layout${showSidebar ? " study-result-layout--split" : ""}`}>
        {/* Corpo principal */}
        <div ref={resultRef} className="study-result-body">
          <header className="study-page-header">
            <p className="study-page-eyebrow">
              <MI name="auto_awesome" size={13} />
              AI Study Insight
            </p>
            <h1 className="study-page-title">{study.topic}</h1>
            <div className="study-page-tags">
              <span className="study-page-tag">{study.modeLabel || "Nota jurídica"}</span>
              <span className="study-page-tag study-page-tag--muted">{estimateReadTime(study.text)}</span>
            </div>
          </header>

          {tab === "mapa" ? (
            <StudyMindMap
              markdown={study.text}
              meta={{ topic: study.topic, mode: study.mode, modeLabel: study.modeLabel }}
            />
          ) : tab === "interativo" ? (
            <StudyInteractive
              markdown={study.text}
              meta={{ topic: study.topic }}
            />
          ) : (
            <StudyDocument
              markdown={study.text}
              meta={{ topic: study.topic, mode: study.mode, modeLabel: study.modeLabel }}
            />
          )}
        </div>

        {/* Pérolas sidebar — visível na aba Estudo Interativo */}
        {showSidebar && (
          <aside className="study-result-sidebar">
            <StudyPearlsCard />
          </aside>
        )}
      </div>

      {/* Aba vertical "Tire dúvidas" */}
      <button
        type="button"
        className="study-chat-fab"
        onClick={() => setChatOpen((v) => !v)}
        aria-label={chatOpen ? "Fechar chat" : "Tire dúvidas"}
      >
        <MI name={chatOpen ? "close" : "chat"} size={14} />
        {chatOpen ? "Fechar" : "Tire dúvidas"}
      </button>

      <StudyChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
