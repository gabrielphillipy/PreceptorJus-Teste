import { FormEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MI } from "@/components/brand/MaterialIcon";
import { useWorkspace } from "@/hooks/useWorkspace";

const TYPES = ["Sugestão", "Problema", "Elogio", "Ideia de recurso"] as const;

export function FeedbackDialog() {
  const location = useLocation();
  const { saveFeedback } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("Sugestão");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setSending(true);

    const feedback = {
      id: `feedback-${Date.now()}`,
      type,
      message: text,
      contact: contact.trim(),
      page: location.pathname || "app",
      date: new Date().toLocaleString("pt-BR"),
    };

    // Backup local sempre (igual ao legacy) — não perde feedback se o webhook falhar.
    saveFeedback(feedback);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedback.type,
          message: feedback.message,
          contact: feedback.contact,
          page: feedback.page,
        }),
      });
      if (response.ok) {
        toast.success("Feedback enviado. Obrigado!", { duration: 2200 });
      } else {
        toast("Feedback salvo localmente.", {
          description: "Não foi possível enviar agora, mas guardamos no seu navegador.",
        });
      }
    } catch {
      toast("Feedback salvo localmente.", {
        description: "Sem conexão com o servidor — guardamos no seu navegador.",
      });
    } finally {
      setSending(false);
      setMessage("");
      setContact("");
      setType("Sugestão");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MI name="feedback" className="text-[18px]" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajude a melhorar o PreceptorJus</DialogTitle>
          <DialogDescription>
            Conte o que ficou confuso, o que quebrou ou qual melhoria faria diferença no seu estudo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              placeholder="Escreva seu feedback…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-contact" className="flex items-center gap-2">
              Contato
              <span className="text-[10px] font-medium text-muted-foreground normal-case tracking-normal">
                opcional
              </span>
            </Label>
            <Input
              id="feedback-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email, WhatsApp ou nome"
            />
          </div>

          <Button type="submit" disabled={sending || !message.trim()} className="w-full">
            {sending ? "Enviando…" : "Enviar feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
