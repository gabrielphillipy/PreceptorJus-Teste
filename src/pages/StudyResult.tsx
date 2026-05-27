import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { isMindMapMode } from "@/lib/study-parser";
import { exportStudyElementPdf } from "@/lib/pdf-export";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { StudyChatDrawer } from "@/components/study/StudyChatDrawer";

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

  // Persiste sempre que chegar um estudo novo via rota
  useEffect(() => {
    if (routeStudy) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(routeStudy)); } catch {}
    }
  }, [routeStudy]);

  if (!study) {
    navigate("/app/study", { replace: true });
    return null;
  }

  const useMindMap = isMindMapMode({ mode: study.mode, topic: study.topic, modeLabel: study.modeLabel });

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
    <div className="stack fade-up">
      {/* Cabeçalho aberto — fora de qualquer card */}
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

      {/* Tab bar sticky */}
      <div className="study-tabbar">
        <div className="study-tabbar__tabs">
          <button
            type="button"
            className="study-tab study-tab--back"
            onClick={() => navigate("/app/study")}
          >
            <MI name="arrow_back" size={15} />
            Novo estudo
          </button>
          <button type="button" className="study-tab study-tab--active">
            <MI name="description" size={15} />
            Documento
          </button>
        </div>
        <div className="study-tabbar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy}>
            <MI name={copied ? "check" : "content_copy"} size={15} />
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <MI name="picture_as_pdf" size={15} />
            {exporting ? "Gerando…" : "PDF"}
          </button>
          <button type="button" className="btn btn--default btn--sm" onClick={handleGenerateExam}>
            <MI name="quiz" size={15} />
            Gerar prova
          </button>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setChatOpen((v) => !v)}
          >
            <MI name={chatOpen ? "close" : "chat"} size={15} />
            {chatOpen ? "Fechar" : "Tire dúvidas"}
          </button>
        </div>
      </div>

      {/* Documento */}
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

      {/* Drawer: Pérolas + Chat */}
      <StudyChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
