import { cn } from "@/lib/utils";

interface MIProps {
  name: string;
  /** Filled variant — Material Symbols 'FILL' axis */
  fill?: boolean;
  weight?: 300 | 400 | 500 | 600 | 700;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

/**
 * Material Symbols Outlined com font-variation-settings.
 * Sempre aria-hidden por padrão (são decorativos — o significado deve
 * vir do texto adjacente).
 */
export function MI({
  name,
  fill = false,
  weight = 400,
  size,
  className,
  "aria-hidden": ariaHidden = true,
}: MIProps) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={cn("material-symbols-outlined", className)}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        ...(size ? { fontSize: `${size}px` } : {}),
      }}
    >
      {name}
    </span>
  );
}
