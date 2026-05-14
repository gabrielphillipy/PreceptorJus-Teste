import { FormEvent, useEffect, useRef, useState } from "react";

import { callAI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineText } from "@/components/study/InlineText";
import { MI } from "@/components/brand/MaterialIcon";

type Message = { role: "user" | "assistant"; content: string };

interface PreceptorChatPanelProps {
  /** Estilo "side panel" no Dashboard (sticky) vs full ("/app/chat") */
  variant?: "side" | "full";
  initialMessages?: Message[];
}

export function PreceptorChatPanel({
  variant = "side",
  initialMessages,
}: PreceptorChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages || [
      {
        role: "assistant",
        content:
          "Olá! Posso explicar artigos, comparar institutos, montar tese de prova ou organizar um roteiro de peça.",
      },
    ],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: value }]);
    setLoading(true);
    try {
      const reply = await callAI({ mode: "chat", message: value });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (error: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Não consegui responder agora. ${error?.message || ""}`.trim(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        variant === "side"
          ? "pjus-chat sticky top-24 min-h-[480px] max-h-[calc(100vh-7rem)] !p-4 grid grid-rows-[auto_1fr_auto]"
          : "pjus-chat min-h-[640px] grid grid-rows-[auto_1fr_auto]"
      }
    >
      <header className="px-1 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-brand-gold">Preceptor Chat</p>
        <h2 className="font-display text-brand-ink text-base mt-1 leading-tight">
          {variant === "side" ? "Tire dúvidas sem sair do estudo" : "Pergunte sobre o tema"}
        </h2>
      </header>

      <div ref={scrollRef} className="overflow-y-auto -mx-1 px-1 sidebar-scroll space-y-3 pb-3">
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="pjus-bubble pjus-bubble--ai flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse [animation-delay:300ms]" />
            <span className="ml-2 text-[12px] font-semibold text-brand-ink-2">Analisando juridicamente…</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_auto] gap-2 pt-2 border-t border-[var(--pjus-hairline)]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Preceptor Chat…"
          aria-label="Pergunta ao Preceptor Chat"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <MI name="send" size={18} />
          <span className="sr-only">Enviar</span>
        </Button>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="pjus-bubble pjus-bubble--user">
        <p className="m-0">{message.content}</p>
      </div>
    );
  }
  // Assistant: parse simples por linha (sem markdown completo aqui — só negrito e tokens)
  const paragraphs = message.content
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p && !/^-{3,}$/.test(p));

  return (
    <div className="pjus-bubble pjus-bubble--ai">
      <div className="grid gap-2">
        {paragraphs.map((line, i) => {
          const h = line.match(/^#{2,3}\s+(.+)$/);
          if (h) {
            return (
              <h4 key={i} className="font-display text-brand-ink text-[13.5px] font-bold m-0">
                <InlineText text={h[1]} />
              </h4>
            );
          }
          const bullet = line.match(/^[-*•]\s+(.+)$/);
          if (bullet) {
            return (
              <p key={i} className="m-0 pl-4 relative">
                <span className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full bg-brand-gold" />
                <InlineText text={bullet[1]} />
              </p>
            );
          }
          return (
            <p key={i} className="m-0">
              <InlineText text={line.replace(/^\d+\.\s+/, "")} />
            </p>
          );
        })}
      </div>
    </div>
  );
}
