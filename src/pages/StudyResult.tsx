import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { isMindMapMode } from "@/lib/study-parser";
import { exportStudyElementPdf } from "@/lib/pdf-export";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

interface StudyData {
  topic: string;
  mode: string;
  modeLabel: string;
  goals?: string;
  sections?: string[];
  text: string;
}

export default function StudyResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const study = location.state?.study as StudyData | undefined;

  const resultRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

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
      <div className="grid-study">
        <div className="stack">
          <div className="toolbar">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => navigate("/app/study")}
            >
              <MI name="arrow_back" size={16} />
              Novo estudo
            </button>
            <span className="toolbar__label">Resultado</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleCopy}>
              <MI name={copied ? "check" : "content_copy"} size={16} />
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              <MI name="picture_as_pdf" size={16} />
              {exporting ? "Gerando PDF…" : "Exportar PDF"}
            </button>
            <button type="button" className="btn btn--default btn--sm" onClick={handleGenerateExam}>
              <MI name="quiz" size={16} />
              Gerar prova
            </button>
          </div>

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

        <div>
          <PreceptorChatPanel variant="side" />
        </div>
      </div>
    </div>
  );
}
