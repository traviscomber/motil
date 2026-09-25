// Sección "Producción" (perforación) de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { Activity, AlertTriangle, CalendarDays, ChevronDown, Coins, MapPin, Timer } from 'lucide-react';
import { cleanEvidenceText, date, money, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export type Asset360DrillEconomics = {
  window_start?: string | null;
  window_end?: string | null;
  last_cost_date?: string | null;
  last_drilling_date?: string | null;
  recognized_cost_events_90d?: number | string | null;
  recognized_cost_clp_90d?: number | string | null;
  drilling_reports_90d?: number | string | null;
  drilled_meters_90d?: number | string | null;
  cost_clp_per_meter_90d?: number | string | null;
  evidence_status?: string | null;
} | null;

export type Asset360DrillingMaintenanceReviewRow = {
  source_report_id: string;
  operation_date?: string | null;
  review_reason?: string | null;
  equipment_status_raw?: string | null;
  machine_observations?: string | null;
  review_status?: string | null;
  linked_work_order_id?: string | null;
  decision_note?: string | null;
  reviewed_at?: string | null;
  has_linked_work_order?: boolean | null;
  policy?: string | null;
};

export type Asset360DrillingHistoryRow = {
  id: string;
  operation_date?: string | null;
  hole_code_raw?: string | null;
  rig_name_raw?: string | null;
  site_raw?: string | null;
  shift_code_raw?: string | null;
  operator_name_raw?: string | null;
  drilled_meters?: number | string | null;
  machine_observations?: string | null;
  drilling_observations?: string | null;
  equipment_status_raw?: string | null;
  mine_raw?: string | null;
  sector_raw?: string | null;
};

export type Asset360DrillOperationalEvidence = {
  window_start?: string | null;
  window_end?: string | null;
  drilling_reports?: number | string | null;
  out_of_service_reports?: number | string | null;
  operational_with_observations_reports?: number | string | null;
  operational_reports?: number | string | null;
  invalid_status_reports?: number | string | null;
  equipment_without_crew_reports?: number | string | null;
  power_outage_reports?: number | string | null;
  water_shortage_reports?: number | string | null;
  install_disassembly_reports?: number | string | null;
  scaling_reports?: number | string | null;
  work_order_count?: number | string | null;
  open_work_order_count?: number | string | null;
  recorded_downtime_hours?: number | string | null;
  external_cost_clp?: number | string | null;
  part_line_count?: number | string | null;
  quantity_installed?: number | string | null;
  installed_parts_cost_clp?: number | string | null;
  availability_days?: number | string | null;
  scheduled_minutes?: number | string | null;
  availability_downtime_minutes?: number | string | null;
  evidence_status?: string | null;
} | null;

export type Asset360DrillEconomicsChange = {
  current_month?: string | null;
  previous_month?: string | null;
  current_cost_clp_per_meter?: number | string | null;
  previous_cost_clp_per_meter?: number | string | null;
  current_cost_clp?: number | string | null;
  previous_cost_clp?: number | string | null;
  current_drilled_meters?: number | string | null;
  previous_drilled_meters?: number | string | null;
  cost_per_meter_change_pct?: number | string | null;
  drilled_meters_change_pct?: number | string | null;
  recognized_cost_change_pct?: number | string | null;
  interpretation_policy?: string | null;
} | null;

export function Asset360DrillingSection({
  drillingHistory,
  recentDrillingMeters,
  consolidatedDrillingMeters,
  consolidatedDrillingReports,
  lastDrillingDate,
  drillOperationalEvidence,
  drillEconomics,
  drillEconomicsChange,
  drillingMaintenanceReview,
}: {
  drillingHistory: Asset360DrillingHistoryRow[];
  recentDrillingMeters: number;
  consolidatedDrillingMeters: number;
  consolidatedDrillingReports: number;
  lastDrillingDate?: string | null;
  drillOperationalEvidence?: Asset360DrillOperationalEvidence;
  drillEconomics?: Asset360DrillEconomics;
  drillEconomicsChange?: Asset360DrillEconomicsChange;
  drillingMaintenanceReview: Asset360DrillingMaintenanceReviewRow[];
}) {
  if (drillingHistory.length === 0) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Producción"
        hint={consolidatedDrillingReports > 0
          ? `${number(consolidatedDrillingMeters, 1)} m acumulados${lastDrillingDate ? ` · última operación ${date(lastDrillingDate)}` : drillingHistory[0]?.operation_date ? ` · última operación ${date(drillingHistory[0].operation_date)}` : ''}`
          : 'Sin producción enlazada'}
      />
      <div className="border-t border-border">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <IdentityItem
            icon={Activity}
            label="Metros perforados acumulados"
            value={`${number(consolidatedDrillingMeters, 1)} m`}
            meta={`${number(consolidatedDrillingReports, 0)} reportes enlazados`}
          />
          <IdentityItem
            icon={CalendarDays}
            label="Última operación"
            value={date(drillingHistory[0]?.operation_date)}
          />
          <IdentityItem
            icon={MapPin}
            label="Última faena"
            value={cleanEvidenceText(drillingHistory[0]?.mine_raw) || cleanEvidenceText(drillingHistory[0]?.site_raw)}
          />
        </div>

        {drillOperationalEvidence ? (
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-3">
            <IdentityItem
              icon={Activity}
              label="Operativo"
              value={drillOperationalEvidence.operational_reports}
              meta={drillOperationalEvidence.window_start && drillOperationalEvidence.window_end
                ? `${date(drillOperationalEvidence.window_start)} → ${date(drillOperationalEvidence.window_end)}`
                : 'Últimos 90 días'}
            />
            <IdentityItem
              icon={AlertTriangle}
              label="Fuera de servicio"
              value={drillOperationalEvidence.out_of_service_reports}
              meta={drillOperationalEvidence.window_start && drillOperationalEvidence.window_end
                ? `${date(drillOperationalEvidence.window_start)} → ${date(drillOperationalEvidence.window_end)}`
                : 'Últimos 90 días'}
            />
            <IdentityItem
              icon={Timer}
              label="Detención registrada"
              value={drillOperationalEvidence.recorded_downtime_hours != null
                ? `${number(drillOperationalEvidence.recorded_downtime_hours, 1)} h`
                : 'Sin base'}
              meta={drillOperationalEvidence.window_end ? `Corte ${date(drillOperationalEvidence.window_end)}` : null}
            />
          </div>
        ) : null}

        {(drillEconomicsChange || drillEconomics || drillingMaintenanceReview.length > 0 || drillingHistory.length > 0) ? (
          <details className="group border-t border-border px-4 py-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Detalle operacional y económico</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Costos por metro, variaciones, señales y reportes individuales
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
            </summary>

            {drillEconomicsChange ? (
              <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <IdentityItem
                  icon={Coins}
                  label="Costo/m mes actual"
                  value={drillEconomicsChange.current_cost_clp_per_meter != null
                    ? `${money(drillEconomicsChange.current_cost_clp_per_meter)}/m`
                    : null}
                  meta={drillEconomicsChange.current_month ? `Período ${date(drillEconomicsChange.current_month)}` : null}
                />
                <IdentityItem
                  icon={Coins}
                  label="Cambio costo/m"
                  value={drillEconomicsChange.cost_per_meter_change_pct != null
                    ? `${number(drillEconomicsChange.cost_per_meter_change_pct, 1)}%`
                    : null}
                  meta={drillEconomicsChange.current_month && drillEconomicsChange.previous_month
                    ? `${date(drillEconomicsChange.previous_month)} → ${date(drillEconomicsChange.current_month)}`
                    : null}
                />
                <IdentityItem
                  icon={Activity}
                  label="Cambio metros"
                  value={drillEconomicsChange.drilled_meters_change_pct != null
                    ? `${number(drillEconomicsChange.drilled_meters_change_pct, 1)}%`
                    : null}
                  meta={drillEconomicsChange.current_month && drillEconomicsChange.previous_month
                    ? `${date(drillEconomicsChange.previous_month)} → ${date(drillEconomicsChange.current_month)}`
                    : null}
                />
              </div>
            ) : null}

            {drillEconomics ? (
              <div className="grid gap-4 border-t border-border py-4 sm:grid-cols-3">
                <IdentityItem
                  icon={Coins}
                  label="Costo 90 días"
                  value={drillEconomics.recognized_cost_clp_90d != null ? money(drillEconomics.recognized_cost_clp_90d) : null}
                  meta={drillEconomics.window_start && drillEconomics.window_end
                    ? `${date(drillEconomics.window_start)} → ${date(drillEconomics.window_end)}`
                    : null}
                />
                <IdentityItem
                  icon={Activity}
                  label="Metros 90 días"
                  value={drillEconomics.drilled_meters_90d != null ? `${number(drillEconomics.drilled_meters_90d, 1)} m` : null}
                />
                <IdentityItem
                  icon={Coins}
                  label="Costo por metro"
                  value={drillEconomics.cost_clp_per_meter_90d != null
                    ? `${money(drillEconomics.cost_clp_per_meter_90d)}/m`
                    : null}
                  meta={drillEconomics.evidence_status || null}
                />
              </div>
            ) : null}

            {drillingMaintenanceReview.length > 0 ? (
              <div className="border-t border-border py-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Señales para revisión de mantención
                </p>
                <div className="mt-3 divide-y divide-border">
                  {drillingMaintenanceReview.slice(0, 4).map((row) => (
                    <div key={row.source_report_id} className="grid gap-2 py-3 md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{date(row.operation_date)}</p>
                        <p className="mt-1 text-xs font-medium">{row.review_status || 'Pendiente'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.review_reason || 'Revisión requerida'}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {row.machine_observations || row.equipment_status_raw || row.decision_note || 'Sin observación adicional'}
                        </p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-xs text-muted-foreground">OT asociada</p>
                        <p className="mt-1 text-sm font-medium">{row.has_linked_work_order ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-border py-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Reportes recientes · {number(recentDrillingMeters, 1)} m en la muestra visible
              </p>
              <div className="mt-3 divide-y divide-border">
                {drillingHistory.slice(0, 8).map((row) => (
                  <div key={row.id} className="grid gap-3 py-3 lg:grid-cols-[120px_120px_minmax(0,1fr)_140px] lg:items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">{date(row.operation_date)}</p>
                      <p className="mt-1 font-mono text-xs">{row.hole_code_raw || 'Sin sondaje'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Producción</p>
                      <p className="mt-1 text-sm font-medium">
                        {row.drilled_meters != null ? `${number(row.drilled_meters, 1)} m` : 'Sin metros registrados'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.operator_name_raw || 'Operador no informado'} · {row.shift_code_raw || 'Sin turno'}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {row.machine_observations || row.drilling_observations || row.equipment_status_raw || 'Sin observaciones'}
                      </p>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-muted-foreground">Ubicación</p>
                      <p className="mt-1 text-sm font-medium">{row.sector_raw || row.site_raw || row.mine_raw || 'No informada'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </details>
  );
}
