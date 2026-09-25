// Sección "Disponibilidad" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { Activity, Timer, Wrench } from 'lucide-react';
import { date, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export type Asset360OperationalState = {
  operational_status?: string | null;
  criticality?: string | null;
  location?: string | null;
  recognized_cost_event_count?: number | string | null;
  last_cost_at?: string | null;
  recognized_cost_clp_lifetime?: number | string | null;
  recognized_cost_clp_ytd?: number | string | null;
  recognized_cost_clp_12m?: number | string | null;
  work_order_count?: number | string | null;
  open_work_order_count?: number | string | null;
  recorded_downtime_hours?: number | string | null;
  drilling_report_count?: number | string | null;
  drilled_meters?: number | string | null;
  last_drilling_date?: string | null;
  sensor_count?: number | string | null;
  sensor_reading_count?: number | string | null;
  evidence_domain_count?: number | string | null;
  availability_evidence_status?: string | null;
  availability_pct?: number | string | null;
  last_availability_date?: string | null;
  availability_days_30d?: number | string | null;
  scheduled_minutes_30d?: number | string | null;
  downtime_minutes_30d?: number | string | null;
} | null;

export function Asset360AvailabilitySection({
  operationalState,
  generatedAt,
}: {
  operationalState: Asset360OperationalState | undefined;
  generatedAt: string | null | undefined;
}) {
  const hasAvailabilityEvidence = Boolean(
    operationalState?.last_availability_date ||
    operationalState?.availability_pct != null ||
    operationalState?.recorded_downtime_hours != null ||
    Number(operationalState?.open_work_order_count || 0) > 0
  );

  if (!hasAvailabilityEvidence) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Disponibilidad"
        hint={operationalState?.last_availability_date
          ? `${operationalState.availability_pct != null ? `${number(operationalState.availability_pct, 1)}%` : 'Sin base'} · ${operationalState.open_work_order_count || 0} OT abiertas`
          : 'Sin base de disponibilidad'}
      />
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <IdentityItem
          icon={Activity}
          label="Disponibilidad"
          value={operationalState?.availability_pct != null ? `${number(operationalState.availability_pct, 1)}%` : 'Sin base'}
          meta={operationalState?.last_availability_date
            ? `Fecha de corte ${date(operationalState.last_availability_date)}`
            : operationalState?.availability_evidence_status || (operationalState?.availability_days_30d ? 'Período: últimos 30 días' : 'Sin fecha de corte')}
        />
        <IdentityItem
          icon={Timer}
          label="Detención registrada"
          value={operationalState?.recorded_downtime_hours != null ? `${number(operationalState.recorded_downtime_hours, 1)} h` : 'Sin base'}
          meta={generatedAt ? `Acumulado al corte ${date(generatedAt)}` : null}
        />
        <IdentityItem
          icon={Wrench}
          label="OT abiertas"
          value={operationalState?.open_work_order_count}
          meta={generatedAt ? `Estado consultado ${date(generatedAt)}` : null}
        />
      </div>
    </details>
  );
}
