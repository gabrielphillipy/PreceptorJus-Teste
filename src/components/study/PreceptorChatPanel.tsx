import { FormEvent, useEffect, useRef, useState } from "react";

import { callAI } from "@/lib/api";
import { InlineText } from "@/components/study/InlineText";
import { MI } from "@/components/brand/MaterialIcon";

type Message = { role: "user" | "assistant"; content: string; time: string };

interface PreceptorChatPanelProps {
  /** "side" — sticky on right rail · "full" — /app/chat · "drawer" — inside slide-in drawer */
  variant?: "side" | "full" | "drawer";
}

const SUGGESTED = [
  "Diferença entre responsabilidade objetiva e subjetiva",
  "Quando cabe agravo de instrumento?",
  "Súmulas vinculantes sobre saúde",
];

function nowHHmm(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PreceptorChatPanel({ variant = "side" }: PreceptorChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá. Sou o Preceptor. Posso ajudar com artigos, súmulas e estrutura de peça. Como posso colaborar?",
      time: nowHHmm(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const send = async (override?: string) => {
    const value = (override ?? draft).trim();
    if (!value || loading) return;
    setMessages((m) => [...m, { role: "user", content: value, time: nowHHmm() }]);
    setDraft("");
    setLoading(true);
    try {
      const reply = await callAI({ mode: "chat", message: value });
      setMessages((m) => [...m, { role: "assistant", content: reply, time: nowHHmm() }]);
    } catch (error: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Não consegui responder agora. ${error?.message || ""}`.trim(),
          time: nowHHmm(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const isFull = variant === "full";
  const isDrawer = variant === "drawer";
  const showSuggested = messages.length <= 1 && !loading;

  return (
    <aside
      className="chat"
      style={
        isFull
          ? { maxWidth: 760, margin: "0 auto", width: "100%" }
          : isDrawer
          ? {}
          : { position: "sticky", top: 84 }
      }
    >
      <p className="chat__title">Preceptor Chat</p>

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: isFull ? 520 : 360,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {loading && (
          <div className="bubble bubble--ai" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={dotStyle(0)} />
            <span style={dotStyle(150)} />
            <span style={dotStyle(300)} />
            <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pjus-ink-3)" }}>
              Analisando juridicamente…
            </span>
          </div>
        )}
      </div>

      {showSuggested && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              onClick={() => send(s)}
              style={{ fontWeight: 500 }}
            >
              <span style={{ color: "rgba(201,168,76,0.9)", marginRight: 4 }}>
                <MI name="auto_awesome" size={14} />
              </span>
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          className="field"
          placeholder="Pergunte ao Preceptor…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Mensagem para o Preceptor"
          disabled={loading}
        />
        <button type="submit" className="send" aria-label="Enviar" disabled={loading || !draft.trim()}>
          <MI name="arrow_upward" size={18} />
        </button>
      </form>
    </aside>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="bubble bubble--user">
        <p style={{ margin: 0 }}>{message.content}</p>
        <span className="bubble__time">{message.time}</span>
      </div>
    );
  }
  // Assistant: split markdown lines into headings/bullets/paragraphs
  const lines = message.content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^-{3,}$/.test(l));

  return (
    <div className="bubble bubble--ai">
      <div style={{ display: "grid", gap: 6 }}>
        {lines.map((line, i) => {
          const h = line.match(/^#{2,3}\s+(.+)$/);
          if (h) {
            return (
              <h4
                key={i}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "rgb(var(--brand-ink))",
                  margin: 0,
                }}
              >
                <InlineText text={h[1]} />
              </h4>
            );
          }
          const bullet = line.match(/^[-*•]\s+(.+)$/);
          if (bullet) {
            return (
              <p key={i} style={{ margin: 0, paddingLeft: 16, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "0.55em",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgb(var(--brand-gold))",
                  }}
                />
                <InlineText text={bullet[1]} />
              </p>
            );
          }
          return (
            <p key={i} style={{ margin: 0 }}>
              <InlineText text={line.replace(/^\d+\.\s+/, "")} />
            </p>
          );
        })}
      </div>
      <span className="bubble__time">{message.time}</span>
    </div>
  );
}

function dotStyle(delay: number): React.CSSProperties {
  return {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgb(var(--brand-gold))",
    animation: "pulse 1.4s ease-in-out infinite",
    animationDelay: `${delay}ms`,
    display: "inline-block",
  };
}
