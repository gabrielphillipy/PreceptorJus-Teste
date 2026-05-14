import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
  /** Variant 'dark' inverts to white-on-navy (use over dark backgrounds) */
  variant?: "default" | "dark" | "white";
}

/**
 * PreceptorJus mark — uma coluna jurídica estilizada (∆ + ∥)
 * tipo balança/coluna de templo, em SVG vetorial puro.
 * Mantém o "PJ" como wordmark separado quando usado ao lado.
 */
export function LogoMark({ className, size = 40, variant = "default" }: LogoMarkProps) {
  const fill = variant === "dark" ? "#FFFFFF" : variant === "white" ? "#FFFFFF" : "#1B2A41";
  const gold = "#C9A84C";
  const bg = variant === "dark" ? "transparent" : variant === "white" ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const border = variant === "dark" ? "rgba(201,168,76,0.5)" : variant === "white" ? "rgba(255,255,255,0.18)" : "rgba(27,42,65,0.12)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-none", className)}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="8" fill={bg} stroke={border} />
      {/* Coluna jurídica: capitel + fuste + base */}
      <rect x="11" y="9" width="18" height="2.2" rx="0.5" fill={fill} />
      <rect x="13.5" y="11.6" width="13" height="1.4" rx="0.4" fill={gold} />
      <rect x="14.5" y="13.6" width="2.8" height="14" rx="0.5" fill={fill} />
      <rect x="22.7" y="13.6" width="2.8" height="14" rx="0.5" fill={fill} />
      <rect x="13.5" y="28" width="13" height="1.4" rx="0.4" fill={gold} />
      <rect x="11" y="29.8" width="18" height="2.2" rx="0.5" fill={fill} />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
  variant?: "default" | "dark";
  showTagline?: boolean;
}

export function Wordmark({ className, variant = "default", showTagline = false }: WordmarkProps) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-display font-extrabold text-[15px] tracking-tight",
          variant === "dark" ? "text-white" : "text-brand-ink",
        )}
      >
        PreceptorJus
      </span>
      {showTagline && (
        <span
          className={cn(
            "mt-1 text-[9px] font-semibold uppercase tracking-[0.16em]",
            variant === "dark" ? "text-brand-gold/85" : "text-brand-gold/85",
          )}
        >
          Advocacia & estudo jurídico
        </span>
      )}
    </div>
  );
}

export function BrandLockup({
  className,
  size = 38,
  variant = "default",
  showTagline = false,
}: LogoMarkProps & { showTagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} variant={variant} />
      <Wordmark variant={variant === "dark" || variant === "white" ? "dark" : "default"} showTagline={showTagline} />
    </div>
  );
}
