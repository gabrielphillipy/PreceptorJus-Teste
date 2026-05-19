import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/useWorkspace";
import type { SavedStudy } from "@/lib/workspace";
import { isMindMapMode } from "@/lib/study-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "Todos os materiais" },
  { value: "favorites", label: "Favoritos" },
  { value: "fechamento", label: "Resumos" },
  { value: "mapa", label: "Mapas mentais" },
  { value: "peca", label: "Peças práticas" },
  { value: "jurisprudencia", label: "Jurisprudência" },
  { value: "questoes", label: "Questões" },
];

export default function Library() {
  const { studies, editStudy, deleteStudy } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const openId = params.get("open");
  const openStudy = openId ? studies.find((s) => s.id === openId) : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studies.filter((s) => {
      if (filter === "favorites" && !s.favorite) return false;
      if (filter !== "all" && filter !== "favorites" && s.mode !== filter) return false;
      if (!q) return true;
      return (
        s.topic.toLowerCase().includes(q) ||
        (s.excerpt || "").toLowerCase().includes(q) ||
        (s.modeLabel || "").toLowerCase().includes(q)
      );
    });
  }, [studies, query, filter]);

  const open = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("open", id);
    setParams(next, { replace: true });
  };
  const closeView = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
  };

  const toggleFav = (s: SavedStudy) =>
    editStudy(s.id, (cur) => ({ ...cur, favorite: !cur.favorite }));

  const rename = (s: SavedStudy) => {
    const novo = window.prompt("Novo nome do material:", s.topic);
    if (novo === null) return;
    const clean = novo.trim();
    if (!clean) return;
    editStudy(s.id, (cur) => ({ ...cur, topic: clean }));
    toast.success("Material renomeado.");
  };

  const remove = (s: SavedStudy) => {
    if (!window.confirm(`Apagar "${s.topic}"? Esta ação não pode ser desfeita.`)) return;
    deleteStudy(s.id);
    toast("Material apagado.");
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <header>
        <Eyebrow>Biblioteca</Eyebrow>
        <h1 className="font-display text-brand-ink">Seus materiais jurídicos.</h1>
        <p className="mt-2 max-w-2xl text-brand-ink-2 leading-relaxed">
          Tudo que você gerou fica salvo aqui. Busque, filtre, favorite ou apague.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="lib-search">Buscar</Label>
          <Input
            id="lib-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Por tema, trecho ou matéria…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lib-filter">Filtro</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger id="lib-filter" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center gap-2 min-h-[200px] p-8 rounded-2xl border border-dashed border-brand-gold/30 bg-[var(--pjus-surface-2)] text-center">
          <MI name="library_books" size={32} className="text-brand-gold" />
          <p className="font-display text-brand-ink">
            {studies.length === 0 ? "Nenhum material salvo ainda." : "Nada encontrado com esse filtro."}
          </p>
          <p className="text-sm text-brand-ink-2">
            {studies.length === 0
              ? "Gere um estudo para salvar automaticamente aqui."
              : "Tente outro termo ou filtro."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <article
              key={s.id}
              className="group flex flex-col gap-2 p-5 rounded-xl border border-[var(--pjus-hairline)] bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-gold">
                  {s.modeLabel || "Estudo jurídico"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFav(s)}
                  title={s.favorite ? "Desfavoritar" : "Favoritar"}
                  className={cn(
                    "shrink-0 transition-colors",
                    s.favorite ? "text-brand-gold" : "text-brand-ink-2/40 hover:text-brand-gold",
                  )}
                >
                  <MI name={s.favorite ? "star" : "star_border"} size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => open(s.id)}
                className="text-left font-display text-brand-ink text-lg leading-tight hover:underline"
              >
                {s.topic}
              </button>

              <p className="text-[13px] text-brand-ink-2 leading-relaxed line-clamp-3 flex-1">
                {s.excerpt || "Material salvo na biblioteca."}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--pjus-hairline)]">
                <span className="text-[11px] text-brand-ink-2">{s.date}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => open(s.id)}>
                    <MI name="visibility" size={15} />
                    Abrir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => rename(s)} title="Renomear">
                    <MI name="edit" size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(s)}
                    title="Apagar"
                    className="text-destructive hover:text-destructive"
                  >
                    <MI name="delete" size={15} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!openStudy} onOpenChange={(o) => !o && closeView()}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{openStudy?.topic}</DialogTitle>
          </DialogHeader>
          {openStudy &&
            (isMindMapMode({
              mode: openStudy.mode,
              topic: openStudy.topic,
              modeLabel: openStudy.modeLabel,
            }) ? (
              <StudyMindMap
                markdown={openStudy.text}
                meta={{ topic: openStudy.topic, mode: openStudy.mode, modeLabel: openStudy.modeLabel }}
              />
            ) : (
              <StudyDocument
                markdown={openStudy.text}
                meta={{ topic: openStudy.topic, mode: openStudy.mode, modeLabel: openStudy.modeLabel }}
              />
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
