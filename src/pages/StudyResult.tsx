import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { callAI, callAIStream } from "@/lib/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { exportStudyElementPdf } from "@/lib/pdf-export";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyInteractive } from "@/components/study/StudyInteractive";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { StudyChatDrawer } from "@/components/study/StudyChatDrawer";
import { StudyPearlsCard } from "@/components/study/StudyPearlsCard";
import { StudyThinking } from "@/components/study/StudyThinking";
import { StudyStreaming } from "@/components/study/StudyStreaming";
import { StudyErrorState } from "@/components/study/StudyErrorState";
import type { StudyFormValues } from "@/components/study/StudyForm";

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
  const { saveStudy } = useWorkspace();
  const routeStudy = location.state?.study as StudyData | undefined;
  const generateReq = location.state?.generate as StudyFormValues | undefined;

  const [generated, setGenerated] = useState<StudyData | null>(null);
  // null = não está gerando; "" = pensando (sem texto ainda); texto = escrevendo
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamDone, setStreamDone] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genMeta, setGenMeta] = useState<{ topic: string; modeLabel: string } | null>(null);

  const reqRef = useRef<StudyFormValues | null>(null);
  const finalTextRef = useRef("");
  const persistedRef = useRef(false);

  const study = routeStudy ?? generated ?? (generateReq ? null : loadSaved());

  const resultRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const initialTab = routeStudy?.mode === "mapa" ? "mapa" : "documento";
  const [tab, setTab] = useState<"documento" | "interativo" | "mapa">(initialTab);

  // ── Conclusão: chamada quando a digitação alcança o texto final ──
  const persist = useCallback(() => {
    const req = reqRef.current;
    if (!req || persistedRef.current) return;
    persistedRef.current = true;
    const text = finalTextRef.current;
    const studyData: StudyData = {
      topic: req.topic,
      mode: req.mode,
      modeLabel: req.modeLabel,
      text,
    };
    saveStudy({
      id: `study-${Date.now()}`,
      topic: req.topic,
      text,
      mode: req.mode,
      modeLabel: req.modeLabel,
      favorite: false,
      excerpt: text.replace(/\s+/g, " ").trim().slice(0, 130),
      date: new Date().toLocaleDateString("pt-BR"),
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(studyData)); } catch {}
    if (req.mode === "mapa") setTab("mapa");
    setGenerated(studyData);
    setStreamingText(null);
    setStreamDone(false);
    navigate("/app/study/result", { replace: true, state: { study: studyData } });
  }, [navigate, saveStudy]);

  // ── Geração com streaming na própria tela ───────────────────────
  const runGeneration = useCallback(
    async (req: StudyFormValues) => {
      reqRef.current = req;
      persistedRef.current = false;
      setGenError(null);
      setGenMeta({ topic: req.topic, modeLabel: req.modeLabel });
      setStreamDone(false);
      setStreamingText("");
      let acc = "";
      const payload = { mode: req.mode, topic: req.topic, goals: req.goals, sections: req.sections };

      try {
        const text = await callAIStream(payload, (full) => {
          acc = full;
          setStreamingText(full);
        });
        // Stream concluído: fixa o texto final e deixa o typewriter alcançar.
        finalTextRef.current = text || acc;
        setStreamingText(finalTextRef.current);
        setStreamDone(true);
      } catch (error: any) {
        if (!acc.trim()) {
          // Streaming não produziu nada → tenta o modo bufferizado.
          try {
            const text = await callAI(payload);
            finalTextRef.current = text;
            setStreamingText(text);
            setStreamDone(true);
            return;
          } catch (fallbackError: any) {
            setStreamingText(null);
            setGenError(fallbackError?.message || "Erro ao gerar.");
            return;
          }
        }
        // Recebeu parte antes de cair → digita o que tem e conclui.
        finalTextRef.current = acc;
        setStreamDone(true);
      }
    },
    [],
  );

  const didStartRef = useRef(false);
  useEffect(() => {
    if (generateReq && !didStartRef.current) {
      didStartRef.current = true;
      runGeneration(generateReq);
    }
  }, [generateReq, runGeneration]);

  useEffect(() => {
    if (routeStudy) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(routeStudy)); } catch {}
    }
  }, [routeStudy]);

  useEffect(() => {
    if (!study && !generateReq && streamingText === null && !genError) {
      navigate("/app/study", { replace: true });
    }
  }, [study, generateReq, streamingText, genError, navigate]);

  // ── Estado: gerando (pensando / escrevendo) ─────────────────────
  if (streamingText !== null) {
    return (
      <div className="study-result-page fade-up">
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
          </div>
        </div>
        <div className="study-result-layout">
          <div className="study-result-body">
            <header className="study-page-header">
              <p className="study-page-eyebrow">
                <MI name="auto_awesome" size={13} />
                AI Study Insight
              </p>
              <h1 className="study-page-title">{genMeta?.topic}</h1>
              <div className="study-page-tags">
                <span className="study-page-tag">{genMeta?.modeLabel || "Nota jurídica"}</span>
              </div>
            </header>
            {streamingText ? (
              <StudyStreaming text={streamingText} done={streamDone} onDone={persist} />
            ) : (
              <StudyThinking />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: erro na geração ─────────────────────────────────────
  if (genError) {
    return (
      <div className="study-result-page fade-up">
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
          </div>
        </div>
        <div className="study-result-layout">
          <div className="study-result-body">
            <StudyErrorState
              message={genError}
              onRetry={() => generateReq && runGeneration(generateReq)}
            />
          </div>
        </div>
      </div>
    );
  }

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
      <div className={`study-result-layout${showSidebar ? " study-result-layout--split" : ""}${tab === "mapa" ? " study-result-layout--mapa" : ""}`}>
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
