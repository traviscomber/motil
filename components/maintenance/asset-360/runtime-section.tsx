// Sección "Medidor y uso" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { ChevronDown } from 'lucide-react';
import { date, money, number } from './format';
import { SectionSummary } from './primitives';

export type Asset360RuntimeCostIntelligence = {
  reading_count?: number | string | null;
  first_reading_at?: string | null;
  last_reading_at?: string | null;
  latest_meter_hours?: number | string | null;
  latest_meter_unit?: string | null;
  observed_operating_hours?: number | string | null;
  reset_count?: number | string | null;
  usable_for_rate_metrics?: boolean | null;
  audited_closures?: number | string | null;
  audited_total_cost?: number | string | null;
  audited_cost_per_operating_hour?: number | string | null;
  meter_evidence_source?: string | null;
  material_meter_decrease_count?: number | string | null;
  meter_sequence_status?: string | null;
} | null;

export type Asset360MeterHistoryRow = {
  id: string;
  recorded_at?: string | null;
  meter_value?: number | string | null;
  meter_unit?: string | null;
  source_kind?: string | null;
  source_reference?: string | null;
};

export function Asset360RuntimeSection({
  hasRuntimeEvidence,
  runtimeCostIntelligence,
  meterHistory,
  effectiveMeterLabel,
  effectiveMeterSuffix,
  effectiveMeterDisplayLabel,
  meterIsScheduleReference,
}: {
  hasRuntimeEvidence: boolean;
  runtimeCostIntelligence?: Asset360RuntimeCostIntelligence;
  meterHistory: Asset360MeterHistoryRow[];
  effectiveMeterLabel: string;
  effectiveMeterSuffix: string;
  effectiveMeterDisplayLabel: string;
  meterIsScheduleReference: boolean;
}) {
  if (!hasRuntimeEvidence) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title={`${effectiveMeterDisplayLabel} y uso`}
        hint={runtimeCostIntelligence?.latest_meter_hours != null
          ? `${number(runtimeCostIntelligence.latest_meter_hours, 1)} ${effectiveMeterSuffix}${runtimeCostIntelligence.last_reading_at ? ` · ${date(runtimeCostIntelligence.last_reading_at)}` : ''}`.trim()
          : 'Sin lectura actual'}
      />
      <div className="border-t border-border">
        <div className="grid gap-px bg-border sm:grid-cols-3">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">{meterIsScheduleReference ? `${effectiveMeterLabel} referencial` : `${effectiveMeterLabel} actual`}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {runtimeCostIntelligence?.latest_meter_hours != null
                ? `${number(runtimeCostIntelligence.latest_meter_hours, 1)} ${effectiveMeterSuffix}`.trim()
                : 'Sin lectura'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {runtimeCostIntelligence?.last_reading_at
                ? `Registrado el ${date(runtimeCostIntelligence.last_reading_at)}`
                : meterIsScheduleReference
                  ? 'Referencia de pauta; sin lectura observada'
                  : 'Sin fecha de lectura'}
            </p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Horas observadas</p>
            <p className="mt-2 text-xl font-semibold">
              {Number(runtimeCostIntelligence?.reading_count || 0) >= 2 &&
              runtimeCostIntelligence?.observed_operating_hours != null
                ? `${number(runtimeCostIntelligence.observed_operating_hours, 1)} h`
                : 'Sin base'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {runtimeCostIntelligence?.first_reading_at && runtimeCostIntelligence?.last_reading_at
                ? `${date(runtimeCostIntelligence.first_reading_at)} → ${date(runtimeCostIntelligence.last_reading_at)}`
                : 'Período no consolidado'}
            </p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Costo auditado / hora</p>
            <p className="mt-2 text-xl font-semibold">
              {runtimeCostIntelligence?.audited_cost_per_operating_hour != null
                ? `${money(runtimeCostIntelligence.audited_cost_per_operating_hour)}/h`
                : 'Sin base'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {runtimeCostIntelligence?.audited_cost_per_operating_hour != null
                ? 'Sólo cierres auditados y horas observadas'
                : 'Requiere cierres auditados y base horaria válida'}
            </p>
          </div>
        </div>

        <details className="group border-t border-border px-4 py-4">
          <summary className="cursor-pointer list-none">
            <span className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Historial de {effectiveMeterLabel.toLowerCase()}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {runtimeCostIntelligence?.reading_count ?? meterHistory.length} lecturas
                  {Number(runtimeCostIntelligence?.material_meter_decrease_count || 0) > 0
                    ? ` · ${number(runtimeCostIntelligence?.material_meter_decrease_count || 0, 0)} descenso material por revisar`
                    : runtimeCostIntelligence?.reset_count != null && Number(runtimeCostIntelligence.reset_count) > 0
                      ? ` · ${number(runtimeCostIntelligence.reset_count, 0)} reinicios detectados`
                      : ''}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-4 border-t border-border pt-3">
            {meterHistory.length > 0 ? (
              <div className="divide-y divide-border">
                {meterHistory.slice(0, 6).map((row) => (
                  <div key={row.id} className="grid gap-2 py-2 sm:grid-cols-[140px_120px_minmax(0,1fr)] sm:items-center">
                    <span className="text-xs text-muted-foreground">{date(row.recorded_at)}</span>
                    <span className="text-sm font-medium">
                      {row.meter_value != null
                        ? `${number(row.meter_value, 1)} ${row.meter_unit || ''}`.trim()
                        : 'Sin lectura'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {row.source_kind || row.source_reference || 'Fuente operacional'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lectura actual disponible desde {runtimeCostIntelligence?.meter_evidence_source || 'evidencia operacional'}, sin historial cronológico enlazado.
              </p>
            )}
          </div>
        </details>
      </div>
    </details>
  );
}
