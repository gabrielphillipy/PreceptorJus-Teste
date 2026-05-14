import { Button } from "@/components/ui/button";
import { MI } from "@/components/brand/MaterialIcon";

interface Props {
  message: string;
  onRetry?: () => void;
}

function detectVariant(message: string): { title: string; hint: string } {
  const lower = message.toLowerCase();
  if (lower.includes("alta demanda") || lower.includes("high demand") || lower.includes("overload")) {
    return {
      title: "IA em alta demanda",
      hint: "Isso costuma ser temporário. Aguarde alguns segundos e tente novamente. Se persistir, reduza o tema ou tente gerar em partes.",
    };
  }
  if (lower.includes("expirou") || lower.includes("timeout") || lower.includes("demorou demais")) {
    return {
      title: "Tempo limite excedido",
      hint: "Tente reduzir seções/objetivos ou gerar novamente.",
    };
  }
  if (lower.includes("tema") && lower.includes("obrigat")) {
    return {
      title: "Tema obrigatório",
      hint: "Preencha o campo Tema antes de gerar o estudo jurídico.",
    };
  }
  if (lower.includes("google_api_key")) {
    return {
      title: "Chave de IA não configurada",
      hint: "Configure a variável GOOGLE_API_KEY no ambiente da Vercel.",
    };
  }
  return { title: "Não foi possível gerar agora", hint: "Tente novamente em instantes." };
}

export function StudyErrorState({ message, onRetry }: Props) {
  const { title, hint } = detectVariant(message);
  return (
    <div className="grid gap-3 p-7 rounded-2xl border border-destructive/20 bg-[#fbf2f3]">
      <div className="flex items-center gap-2.5 text-destructive">
        <MI name="error" size={24} />
        <h2 className="font-display text-xl m-0 text-destructive">{title}</h2>
      </div>
      <p className="text-[14px] text-brand-ink-2 leading-relaxed m-0">{message}</p>
      <p className="text-[13px] text-brand-ink-2 leading-relaxed m-0">{hint}</p>
      {onRetry && (
        <div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
