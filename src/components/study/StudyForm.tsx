import { FormEvent, useState } from "react";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { DEFAULT_SECTIONS, STUDY_MODES, type StudyMode } from "@/lib/api";

export interface StudyFormValues {
  topic: string;
  goals: string[];
  sections: string[];
  mode: StudyMode;
  modeLabel: string;
}

interface StudyFormProps {
  initialTopic?: string;
  loading?: boolean;
  onSubmit: (values: StudyFormValues) => void;
}

export function StudyForm({ initialTopic = "", loading, onSubmit }: StudyFormProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [goals, setGoals] = useState("");
  const [mode, setMode] = useState<StudyMode>("fechamento");
  const [sections, setSections] = useState<string[]>(["Conceito", "Base legal", "Jurisprudência", "Questões"]);
  const [touched, setTouched] = useState(false);

  const hasError = touched && !topic.trim();
  const currentMode = STUDY_MODES.find((m) => m.value === mode);

  const toggleSection = (s: string) =>
    setSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!topic.trim()) return;
    onSubmit({
      topic: topic.trim(),
      goals: goals.split("\n").map((g) => g.trim()).filter(Boolean),
      sections,
      mode,
      modeLabel: currentMode?.label || "Estudo jurídico",
    });
  };

  return (
    <form className="summary" onSubmit={submit}>
      <div className="summary__head">
        <Eyebrow>Nova nota jurídica</Eyebrow>
        <h1 style={{ fontSize: 24 }}>Componha seu estudo como uma minuta de parecer.</h1>
        <p>Informe tema, objetivos e seções. A IA organiza fundamentos, artigos e pontos de prova.</p>
      </div>

      <div className="summary__body" style={{ display: "grid", gap: 18 }}>
        <div>
          <label className="label" htmlFor="study-topic">Tema</label>
          <input
            id="study-topic"
            className="field"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex.: Responsabilidade civil objetiva"
            maxLength={500}
            style={hasError ? { borderColor: "#B5574E", boxShadow: "0 0 0 3px rgba(181,87,78,0.15)" } : undefined}
            aria-invalid={hasError}
          />
          {hasError && (
            <p style={{ fontSize: 12, fontWeight: 500, color: "#B5574E", margin: "6px 0 0" }}>
              Preencha o tema antes de gerar o estudo.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="study-goals">
            Objetivos <span className="label__opt">opcional · 1 por linha</span>
          </label>
          <textarea
            id="study-goals"
            className="field"
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder={"Ex.: comparar regra e exceção\nmapear artigos importantes\ntreinar pontos de prova"}
          />
        </div>

        <div>
          <label className="label" htmlFor="study-mode">Modo de estudo</label>
          <div className="select__wrap">
            <select
              id="study-mode"
              className="field select"
              value={mode}
              onChange={(e) => setMode(e.target.value as StudyMode)}
            >
              {STUDY_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {currentMode && (
            <p style={{ fontSize: 12, color: "var(--pjus-ink-3)", margin: "6px 0 0" }}>
              {currentMode.description}
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Seções{" "}
            <span className="label__opt">
              {sections.length} selecionada{sections.length === 1 ? "" : "s"}
            </span>
          </label>
          <div className="chips">
            {DEFAULT_SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${sections.includes(s) ? "on" : ""}`}
                onClick={() => toggleSection(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--default btn--xl btn-shimmer"
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  height: 14,
                  width: 14,
                  borderRadius: 999,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Gerando…
            </>
          ) : (
            <>
              <MI name="auto_awesome" size={20} />
              Gerar estudo jurídico
            </>
          )}
        </button>
      </div>
    </form>
  );
}
