// Sección "Planificación" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import Link from 'next/link';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Gauge,
  PackageCheck,
  Timer,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { date, number } from './format';
import { IdentityItem, SectionSummary } from './primitives';

export type Asset360MaintenancePriority = {
  meter_unit?: string | null;
  interval_mp?: number | string | null;
  last_mp?: number | string | null;
  next_due_meter?: number | string | null;
  current_reading_at?: string | null;
  current_reading?: number | string | null;
  remaining_meter?: number | string | null;
  interval_consumed?: number | string | null;
  utilization_per_day?: number | string | null;
  projected_days?: number | string | null;
  projected_due_at?: string | null;
  criticality_raw?: string | null;
  criticality_score?: number | string | null;
  urgency_score?: number | string | null;
  total_score?: number | string | null;
  priority?: string | null;
  recommended_action?: string | null;
  scheduled_date?: string | null;
  programming_status_raw?: string | null;
  responsible_raw?: string | null;
  parts_status_raw?: string | null;
  observations?: string | null;
  match_method?: string | null;
  match_score?: number | string | null;
} | null;

export type Asset360MaintenancePlanningRow = {
  id: string;
  source_row?: number | null;
  mine_raw?: string | null;
  asset_name_raw?: string | null;
  meter_unit?: string | null;
  interval_mp?: number | string | null;
  last_mp?: number | string | null;
  initial_reading_at?: string | null;
  initial_reading?: number | string | null;
  current_reading_at?: string | null;
  current_reading?: number | string | null;
  criticality_raw?: string | null;
  scheduled_date?: string | null;
  programming_status_raw?: string | null;
  responsible_raw?: string | null;
  parts_status_raw?: string | null;
  observations?: string | null;
  workbook_priority_raw?: string | null;
  workbook_action_raw?: string | null;
  updated_at?: string | null;
};

export function Asset360PlanningSection({
  planningPriorityText,
  maintenancePriority,
  latestPlan,
  canEdit,
  assetCode,
  assetName,
}: {
  planningPriorityText: string;
  maintenancePriority?: Asset360MaintenancePriority;
  latestPlan?: Asset360MaintenancePlanningRow | null;
  canEdit?: boolean;
  assetCode?: string | null;
  assetName?: string | null;
}) {
  return (
    <details className="group rounded-lg border border-border bg-card" open={planningPriorityText.startsWith('P1') || planningPriorityText.startsWith('P2') || (!maintenancePriority && !latestPlan)}>
      <SectionSummary
        title="Planificación"
        hint={maintenancePriority
          ? `${String(maintenancePriority.priority || '').toUpperCase().includes('SIN LÍNEA BASE') ? 'Base técnica sin programación' : maintenancePriority.priority || 'Sin prioridad'} · ${maintenancePriority.programming_status_raw || 'sin estado de programación'}`
          : latestPlan
            ? `${String(latestPlan.programming_status_raw || '').toLowerCase() === 'no programado' ? 'Pauta técnica · no programada' : latestPlan.programming_status_raw || 'Pauta disponible'}${latestPlan.parts_status_raw ? ` · repuestos ${String(latestPlan.parts_status_raw).toLowerCase()}` : ''}`
            : 'Sin planificación enlazada'}
      />
      {maintenancePriority ? (
        <div className="border-t border-border">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <IdentityItem
              icon={Activity}
              label="Prioridad"
              value={maintenancePriority.priority}
              meta={maintenancePriority.current_reading_at
                ? `Con lectura del ${date(maintenancePriority.current_reading_at)}`
                : latestPlan?.updated_at
                  ? `Fuente actualizada ${date(latestPlan.updated_at)}`
                  : null}
            />
            <IdentityItem
              icon={Gauge}
              label="Umbral de intervención"
              value={maintenancePriority.next_due_meter != null
                ? `${number(maintenancePriority.next_due_meter, 1)} ${maintenancePriority.meter_unit || ''}`
                : null}
              meta={maintenancePriority.projected_due_at
                ? `Proyección ${date(maintenancePriority.projected_due_at)}`
                : maintenancePriority.scheduled_date
                  ? `Programado ${date(maintenancePriority.scheduled_date)}`
                  : null}
            />
            <IdentityItem
              icon={CalendarDays}
              label="Estado de programación"
              value={maintenancePriority.programming_status_raw || 'Sin estado'}
              meta={maintenancePriority.responsible_raw ? `Responsable: ${maintenancePriority.responsible_raw}` : null}
            />
            <IdentityItem
              icon={PackageCheck}
              label="Repuestos en pauta"
              value={maintenancePriority.parts_status_raw || 'Sin estado'}
              meta="Estado de planificación; no equivale a quiebre de stock"
            />
          </div>
          {maintenancePriority.recommended_action ? (
            <div className="border-t border-border px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Siguiente acción
              </p>
              <p className="mt-2 text-sm font-medium">{maintenancePriority.recommended_action}</p>
              {maintenancePriority.observations ? (
                <details className="group mt-3">
                  <summary className="cursor-pointer list-none text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      Ver observaciones
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{maintenancePriority.observations}</p>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : latestPlan ? (
        <div className="border-t border-border">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <IdentityItem
              icon={Timer}
              label="Intervalo"
              value={latestPlan.interval_mp != null
                ? `${number(latestPlan.interval_mp, 1)} ${latestPlan.meter_unit || ''}`
                : null}
              meta={latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null}
            />
            <IdentityItem
              icon={CalendarDays}
              label="Estado de programación"
              value={latestPlan.programming_status_raw || 'Sin estado'}
              meta={latestPlan.scheduled_date
                ? `Programado ${date(latestPlan.scheduled_date)}`
                : latestPlan.responsible_raw
                  ? `Responsable: ${latestPlan.responsible_raw}`
                  : null}
            />
            {latestPlan.responsible_raw && latestPlan.scheduled_date ? (
              <IdentityItem
                icon={Wrench}
                label="Responsable"
                value={latestPlan.responsible_raw}
              />
            ) : null}
            <IdentityItem
              icon={PackageCheck}
              label="Repuestos en pauta"
              value={latestPlan.parts_status_raw || 'Sin estado'}
              meta="Estado de planificación; no equivale a quiebre de stock"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Sin planificación de mantenimiento enlazada</p>
          {canEdit ? (
            <Button asChild size="sm">
              <Link
                href={`/dashboard/mantenimiento/planes-estandar?new=1&assetCode=${encodeURIComponent(assetCode || '')}&assetName=${encodeURIComponent(assetName || '')}`}
              >
                <Wrench className="mr-1 h-4 w-4" />
                Crear plan estándar
              </Link>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Sin permisos para crear planes.</p>
          )}
        </div>
      )}
    </details>
  );
}
