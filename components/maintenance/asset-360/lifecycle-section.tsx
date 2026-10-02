// Sección "Ciclo de vida" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { Activity, CalendarDays, Timer } from 'lucide-react';
import { date, money, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export function Asset360LifecycleSection({
  hasLifecycleEvidence,
  assetAgeYears,
  expectedLifespan,
  remainingLifeYears,
  acquisitionDate,
  acquisitionCost,
  lifecycleState,
  lifecycleReason,
  lifecycleChangedAt,
  lifecycleChangedBy,
}: {
  hasLifecycleEvidence: boolean;
  assetAgeYears: number | null;
  expectedLifespan: number | null;
  remainingLifeYears: number | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | string | null;
  lifecycleState?: string | null;
  lifecycleReason?: string | null;
  lifecycleChangedAt?: string | null;
  lifecycleChangedBy?: string | null;
}) {
  if (!hasLifecycleEvidence) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Ciclo de vida"
        hint={remainingLifeYears != null
          ? `${number(remainingLifeYears, 1)} años remanentes estimados`
          : acquisitionDate
            ? `Adquirido ${date(acquisitionDate)}`
            : 'Vida útil no informada'}
      />
      <div className="border-t border-border">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <IdentityItem icon={CalendarDays} label="Adquisición" value={date(acquisitionDate)} />
          <IdentityItem icon={Timer} label="Edad estimada" value={assetAgeYears != null ? `${number(assetAgeYears, 1)} años` : 'No informado'} />
          <IdentityItem
            icon={Activity}
            label="Vida remanente"
            value={remainingLifeYears != null ? `${number(remainingLifeYears, 1)} años` : 'No informado'}
            meta={expectedLifespan != null ? `Vida esperada ${number(expectedLifespan, 0)} años` : null}
          />
        </div>
        {lifecycleState || lifecycleReason || lifecycleChangedAt || lifecycleChangedBy ? (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Estado de ciclo de vida</p>
            <p className="mt-1 text-sm font-medium">{lifecycleState || 'Estado no informado'}</p>
            {lifecycleReason ? <p className="mt-1 text-xs text-muted-foreground">{lifecycleReason}</p> : null}
            {lifecycleChangedAt || lifecycleChangedBy ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {lifecycleChangedAt ? `Actualizado ${date(lifecycleChangedAt)}` : 'Actualización registrada'}
                {lifecycleChangedBy ? ` · ${lifecycleChangedBy}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {acquisitionCost != null ? (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Costo de adquisición</p>
            <p className="mt-1 text-sm font-medium">{money(acquisitionCost)}</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
