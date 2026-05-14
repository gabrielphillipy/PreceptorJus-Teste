import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { DEFAULT_SECTIONS, STUDY_MODES, type StudyMode } from "@/lib/api";
import { cn } from "@/lib/utils";

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!topic.trim()) return;
    const modeLabel = STUDY_MODES.find((m) => m.value === mode)?.label || "Estudo jurídico";
    onSubmit({
      topic: topic.trim(),
      goals: goals.split("\n").map((g) => g.trim()).filter(Boolean),
      sections,
      mode,
      modeLabel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="pjus-summary relative animate-fade-up">
      <div className="pjus-summary__head">
        <Eyebrow>Nova nota jurídica</Eyebrow>
        <h1 className="font-display text-brand-ink text-[1.85rem] leading-tight">
          Componha seu estudo como uma minuta de parecer.
        </h1>
        <p className="mt-2 text-sm text-brand-ink-2 leading-relaxed max-w-2xl">
          Informe tema, objetivos e seções. A IA organiza fundamentos, artigos e pontos de prova.
        </p>
      </div>

      <div className="p-7 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="study-topic">Tema</Label>
          <Input
            id="study-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex.: Responsabilidade civil objetiva"
            maxLength={500}
            className={cn(hasError && "border-destructive focus-visible:ring-destructive/30")}
            aria-invalid={hasError}
            aria-describedby={hasError ? "study-topic-error" : undefined}
          />
          {hasError && (
            <p id="study-topic-error" className="text-[12px] font-medium text-destructive">
              Preencha o tema antes de gerar o estudo.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="study-goals" className="flex items-center gap-2">
            Objetivos
            <span className="text-[10px] font-medium text-muted-foreground normal-case tracking-normal">
              opcional · 1 por linha
            </span>
          </Label>
          <Textarea
            id="study-goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={4}
            placeholder={`Ex.: comparar regra e exceção\nmapear artigos importantes\ntreinar pontos de prova`}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="study-mode">Modo de estudo</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as StudyMode)}>
            <SelectTrigger id="study-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STUDY_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[12px] text-muted-foreground">
            {STUDY_MODES.find((m) => m.value === mode)?.description}
          </p>
        </div>

        <div className="grid gap-2">
          <Label>
            Seções
            <span className="ml-2 text-[10px] font-medium text-muted-foreground normal-case tracking-normal">
              {sections.length} selecionada{sections.length === 1 ? "" : "s"}
            </span>
          </Label>
          <ToggleGroup
            type="multiple"
            value={sections}
            onValueChange={(v) => setSections(v)}
            className="justify-start"
          >
            {DEFAULT_SECTIONS.map((s) => (
              <ToggleGroupItem key={s} value={s} className="text-[12px]">
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button
          type="submit"
          size="xl"
          disabled={loading}
          className="w-full mt-2 btn-shimmer"
        >
          {loading ? (
            <>
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden
              />
              Gerando…
            </>
          ) : (
            <>
              <MI name="auto_awesome" size={20} />
              Gerar estudo jurídico
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
