// Sección "Señales de intervención" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { ChevronDown } from 'lucide-react';
import { date, number } from './format';
import { SectionSummary } from './primitives';

export type Asset360MaintenanceTaskCandidate = {
  rig_name?: string | null;
  component_key?: string | null;
  suggested_task?: string | null;
  observation_count?: number | string | null;
  out_of_service_count?: number | string | null;
  first_observed_at?: string | null;
  last_observed_at?: string | null;
  latest_status?: string | null;
  latest_observation?: string | null;
  signal_status?: string | null;
  evidence_class?: string | null;
};

export type Asset360StandardJobPlan = {
  id: string;
  plan_code?: string | null;
  name?: string | null;
  work_type?: string | null;
  status?: string | null;
  estimated_duration_hours?: number | string | null;
  labor_people_required?: number | string | null;
  skill_requirement?: string | null;
  safety_controls?: string | null;
  required_document_reference?: string | null;
  reason?: string | null;
  evidence_reference?: string | null;
  approved_at?: string | null;
};

export function Asset360InterventionSection({
  maintenanceTaskCandidates,
  standardJobPlans,
}: {
  maintenanceTaskCandidates: Asset360MaintenanceTaskCandidate[];
  standardJobPlans: Asset360StandardJobPlan[];
}) {
  if (maintenanceTaskCandidates.length === 0 && standardJobPlans.length === 0) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Señales de intervención"
        hint={maintenanceTaskCandidates.length > 0
          ? `${maintenanceTaskCandidates.length} señales observadas`
          : `${standardJobPlans.length} planes estándar disponibles`}
      />
      <div className="border-t border-border">
        {maintenanceTaskCandidates.length > 0 ? (
          <div className="p-4">
            <div className="mb-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Evidencia operacional
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Observaciones que requieren revisión humana. No equivalen a diagnóstico ni a una OT autorizada.
              </p>
            </div>
            <div className="divide-y divide-border">
              {maintenanceTaskCandidates.slice(0, 6).map((row, index) => (
                <div key={`${row.component_key || 'signal'}-${index}`} className="grid gap-3 py-3 lg:grid-cols-[170px_minmax(0,1fr)_150px] lg:items-center">
                  <div>
                    <p className="text-sm font-medium">{row.component_key || 'Componente'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.signal_status || row.latest_status || 'Observado'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      {row.latest_observation || 'Condición observada sin detalle adicional'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {number(row.observation_count || 0, 0)} observaciones
                      {Number(row.out_of_service_count || 0) > 0
                        ? ` · ${number(row.out_of_service_count || 0, 0)} fuera de servicio`
                        : ''}
                    </p>
                    {row.suggested_task ? (
                      <p className="mt-2 text-xs font-medium">Revisar: {row.suggested_task}</p>
                    ) : null}
                  </div>
                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">Última evidencia</p>
                    <p className="mt-1 text-sm font-medium">{date(row.last_observed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            No hay señales operacionales enlazadas a este equipo.
          </div>
        )}

        {standardJobPlans.length > 0 ? (
          <details className="group border-t border-border px-4 py-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Planes estándar disponibles</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Referencias aprobadas para planificación; no implican ejecución automática.
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {standardJobPlans.length}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </span>
            </summary>
            <div className="mt-4 divide-y divide-border border-t border-border pt-1">
              {standardJobPlans.slice(0, 3).map((plan) => (
                <div key={plan.id} className="grid gap-3 py-3 lg:grid-cols-[150px_minmax(0,1fr)_180px] lg:items-center">
                  <div>
                    <p className="font-mono text-xs">{plan.plan_code || 'Sin código'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.status || 'Sin estado'}
                      {plan.approved_at ? ` · aprobado ${date(plan.approved_at)}` : ''}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {plan.name || plan.work_type || 'Plan de intervención'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.skill_requirement || plan.reason || 'Sin requisito adicional'}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-sm font-medium">
                      {plan.estimated_duration_hours != null
                        ? `${number(plan.estimated_duration_hours, 1)} h`
                        : 'Sin duración'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.labor_people_required != null
                        ? `${number(plan.labor_people_required, 0)} personas`
                        : 'Dotación no informada'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </details>
  );
}
