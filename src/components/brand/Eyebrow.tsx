import { cn } from "@/lib/utils";

interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "default" | "gold" | "center";
  children: React.ReactNode;
}

export function Eyebrow({ variant = "default", className, children, ...props }: EyebrowProps) {
  return (
    <p
      className={cn(
        "pjus-eyebrow",
        variant === "gold" && "pjus-eyebrow--gold",
        variant === "center" && "pjus-eyebrow--center",
        className,
      )}
      {...props}
    >
      {variant === "center" && <span aria-hidden />}
      {children}
    </p>
  );
}

export function GoldRule({ className }: { className?: string }) {
  return <div className={cn("pjus-gold-rule", className)} aria-hidden />;
}
