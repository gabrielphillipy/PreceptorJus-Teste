import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/useWorkspace";
import type { SavedStudy } from "@/lib/workspace";
import { isMindMapMode } from "@/lib/study-parser";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MI } from "@/components/brand/MaterialIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudyDocument } from "@/components/study/StudyDocument";
import { StudyMindMap } from "@/components/study/StudyMindMap";
import { InlineText } from "@/components/study/InlineText";

// Editorial mode labels (kit calls these "Fechamento / Peça / etc.")
const MODE_LABELS: Record<string, string> = {
  fechamento: "Fechamento",
  mapa: "Mapa mental",
  peca: "Peça",
  jurisprudencia: "Jurisprudência",
  questoes: "Questões",
  "": "Estudo jurídico",
};

const MODE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "fechamento", label: "Fechamento" },
  { value: "peca", label: "Peça" },
  { value: "jurisprudencia", label: "Jurisprudência" },
  { value: "questoes", label: "Questões" },
  { value: "mapa", label: "Mapa mental" },
];

export default function Library() {
  const { studies, editStudy, deleteStudy } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [onlyFav, setOnlyFav] = useState(false);

  const openId = params.get("open");
  const openStudy = openId ? studies.find((s) => s.id === openId) : undefined;

  // Counts per filter for the chip badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: studies.length };
    for (const f of MODE_FILTERS) {
      if (f.value === "all") continue;
      c[f.value] = studies.filter((s) => s.mode === f.value).length;
    }
    return c;
  }, [studies]);
  const favCount = useMemo(() => studies.filter((s) => s.favorite).length, [studies]);
  const areaCount = useMemo(
    () => new Set(studies.map((s) => MODE_LABELS[s.mode] || "Estudo")).size,
    [studies],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studies.filter((s) => {
      if (onlyFav && !s.favorite) return false;
      if (filter !== "all" && s.mode !== filter) return false;
      if (!q) return true;
      return (
        s.topic.toLowerCase().includes(q) ||
        (s.excerpt || "").toLowerCase().includes(q) ||
        (s.modeLabel || "").toLowerCase().includes(q)
      );
    });
  }, [studies, query, filter, onlyFav]);

  const openView = (id: string) => {
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

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
    setOnlyFav(false);
  };

  const hasActiveFilter = !!query || filter !== "all" || onlyFav;

  return (
    <div className="stack fade-up">
      <header className="page-header">
        <div className="between" style={{ flexWrap: "wrap", gap: 18 }}>
          <div>
            <Eyebrow>Biblioteca</Eyebrow>
            <h1>
              Arquivo <span className="serif">jurídico</span> pessoal.
            </h1>
            <p>
              Seus fechamentos, peças, mapas e súmulas — buscáveis por tema, área ou modo. Tudo salvo
              localmente.
            </p>
          </div>
          <div
            className="row"
            style={{ display: "inline-flex", gap: 24, fontFamily: "var(--font-mono)" }}
          >
            <LibStat val={studies.length} lbl="itens" />
            <LibStat val={favCount} lbl="favoritos" gold />
            <LibStat val={areaCount} lbl="modos" />
          </div>
        </div>
      </header>

      <div className="lib-toolbar">
        <div className="lib-search">
          <MI name="search" />
          <input
            type="search"
            placeholder="Buscar tema, trecho ou modo — ex.: 'responsabilidade', 'Art. 927'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="lib-filters">
          {MODE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`lib-filter ${filter === f.value ? "on" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              <span>{f.label}</span>
              <span className="count">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`btn ${onlyFav ? "btn--default" : "btn--outline"} btn--sm`}
          onClick={() => setOnlyFav((v) => !v)}
        >
          <MI name={onlyFav ? "bookmark" : "bookmark_border"} size={16} />
          Favoritos
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="lib-empty">
          <span style={{ color: "rgba(201,168,76,0.7)" }}>
            <MI name="folder_open" size={32} />
          </span>
          <strong>
            {studies.length === 0 ? "Arquivo ainda vazio." : "Nada encontrado."}
          </strong>
          <p>
            {studies.length === 0
              ? "Gere um estudo e ele aparece aqui automaticamente."
              : "Tente outra busca, troque o filtro ou limpe tudo."}
          </p>
          {hasActiveFilter && (
            <button className="btn btn--outline btn--sm" onClick={clearFilters}>
              <MI name="restart_alt" size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="lib-shelf">
          <header className="lib-shelf__head">
            <span>Modo</span>
            <span>Tema</span>
            <span>Área</span>
            <span>Data</span>
            <span className="right">Ações</span>
          </header>
          {filtered.map((s) => (
            <article key={s.id} className="lib-row" onClick={() => openView(s.id)}>
              <span className="lib-row__mode">
                <span className="col-divider" />
                {MODE_LABELS[s.mode] || s.modeLabel || "Estudo"}
              </span>
              <div className="lib-row__main">
                <h3 className="lib-row__topic">{s.topic}</h3>
                <p className="lib-row__excerpt">
                  <InlineText text={s.excerpt || "Material salvo na biblioteca."} />
                </p>
              </div>
              <span className="lib-row__area">{s.modeLabel || "Estudo jurídico"}</span>
              <span className="lib-row__date">{s.date}</span>
              <span className="lib-row__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`lib-row__fav ${s.favorite ? "on" : ""}`}
                  onClick={() => toggleFav(s)}
                  aria-label={s.favorite ? "Remover dos favoritos" : "Favoritar"}
                  title={s.favorite ? "Remover dos favoritos" : "Favoritar"}
                >
                  <MI name={s.favorite ? "bookmark" : "bookmark_border"} />
                </button>
                <button
                  type="button"
                  className="lib-row__more"
                  onClick={() => rename(s)}
                  aria-label="Renomear"
                  title="Renomear"
                >
                  <MI name="edit" />
                </button>
                <button
                  type="button"
                  className="lib-row__more"
                  onClick={() => remove(s)}
                  aria-label="Apagar"
                  title="Apagar"
                  style={{ color: "#B5574E" }}
                >
                  <MI name="delete" />
                </button>
              </span>
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

function LibStat({ val, lbl, gold }: { val: number; lbl: string; gold?: boolean }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: gold ? "rgb(var(--brand-gold))" : "rgb(var(--brand-ink))",
        }}
      >
        {val}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--pjus-ink-3)",
        }}
      >
        {lbl}
      </span>
    </span>
  );
}
