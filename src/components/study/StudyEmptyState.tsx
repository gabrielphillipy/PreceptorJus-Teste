import { MI } from "@/components/brand/MaterialIcon";

export function StudyEmptyState() {
  return (
    <div className="grid place-items-center gap-3 min-h-[420px] p-10 rounded-2xl border border-dashed border-[var(--pjus-hairline)] bg-white text-center">
      <MI name="contract" size={40} className="text-brand-gold/70" />
      <p className="font-display text-brand-ink text-lg font-bold">Nenhum estudo gerado ainda</p>
      <p className="text-sm text-brand-ink-2 max-w-md leading-relaxed">
        Informe um tema jurídico no painel ao lado e gere a nota — o resultado aparece aqui como uma minuta de
        gabinete.
      </p>
    </div>
  );
}
