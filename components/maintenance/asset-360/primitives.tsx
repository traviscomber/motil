// Primitivas presentacionales de la ficha 360 operacional.
// Extraídas de asset-360-overview.tsx como primer paso para dividir el
// componente en secciones mantenibles.

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { show } from './format';

export function IdentityItem({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: LucideIcon;
  label: string;
  value: unknown;
  meta?: string | null;
}) {
  return (
    <div className="min-w-0 border-l border-border/70 pl-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{show(value)}</p>
      {meta ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

export function SectionSummary({
  title,
  hint,
}: {
  title: string;
  hint?: string | null;
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {hint ? <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{hint}</p> : null}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        Ver detalle
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
  );
}
