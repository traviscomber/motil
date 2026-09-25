// Sección "Mantenimiento" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { number } from './format';
import { IdentityItem, SectionSummary } from './primitives';
import type { Asset360ActionableWorkOrder } from './attention-card';

export type Asset360NextPreventive = {
  schedule_id: string;
  task_name?: string | null;
  frequency_hours?: number | string | null;
  due_meter?: number | string | null;
  effective_current_meter?: number | string | null;
  meter_evidence_source?: string | null;
  hour_status?: string | null;
  remaining_hours?: number | string | null;
  alert_due?: boolean;
  generated_work_order_id?: string | null;
} | null;

export type Asset360Reliability = {
  audited_closures?: number;
  recurring_cause_count?: number;
  max_same_cause_occurrences?: number;
  audited_total_cost?: number | string | null;
  audited_avg_cost?: number | string | null;
  total_downtime_hours?: number | string | null;
  avg_days_between_audited_interventions?: number | string | null;
  has_recurring_root_cause?: boolean;
  last_audited_closure_at?: string | null;
} | null;

export type Asset360RuntimeReliability = {
  audited_corrective_events?: number;
  corrective_events_with_meter?: number;
  valid_mtbf_intervals?: number;
  mtbf_operating_hours?: number | string | null;
  mttr_hours?: number | string | null;
  meter_event_coverage_percent?: number | string | null;
} | null;

export function Asset360MaintenanceSection({
  nextPreventive,
  pendingPlanSteps,
  readyToClose,
  criticalOpen,
  overduePreventives,
  operationalBlockers,
  runtimeResetCount,
  actionableWorkOrder,
  reliability,
  runtimeReliability,
}: {
  nextPreventive: Asset360NextPreventive | undefined;
  pendingPlanSteps: number;
  readyToClose: number;
  criticalOpen: number;
  overduePreventives: number;
  operationalBlockers: number;
  runtimeResetCount: number;
  actionableWorkOrder: Asset360ActionableWorkOrder | null;
  reliability: Asset360Reliability | undefined;
  runtimeReliability: Asset360RuntimeReliability | undefined;
}) {
  const mtbf =
    Number(runtimeReliability?.valid_mtbf_intervals || 0) > 0 && runtimeReliability?.mtbf_operating_hours != null
      ? `${number(runtimeReliability.mtbf_operating_hours, 1)} h`
      : 'Sin base';
  const mttr =
    Number(runtimeReliability?.audited_corrective_events || 0) > 0 && runtimeReliability?.mttr_hours != null
      ? `${number(runtimeReliability.mttr_hours, 1)} h`
      : 'Sin base';
  const hasReliabilityEvidence = Boolean(
    Number(reliability?.audited_closures || 0) > 0 ||
    Number(runtimeReliability?.audited_corrective_events || 0) > 0
  );
  const showExecutionCard = Boolean(
    actionableWorkOrder ||
    pendingPlanSteps ||
    readyToClose ||
    criticalOpen ||
    runtimeResetCount > 0
  );
  const maintenanceNeedsAttention = Boolean(
    criticalOpen > 0 ||
    overduePreventives > 0 ||
    operationalBlockers > 0 ||
    actionableWorkOrder
  );

  return (
    <details className="group rounded-lg border border-border bg-card" open={maintenanceNeedsAttention}>
      <SectionSummary
        title="Mantenimiento"
        hint={nextPreventive
          ? `Próximo: ${nextPreventive.task_name || 'preventivo'}${nextPreventive.due_meter != null ? ` · ${number(nextPreventive.due_meter, 0)} h` : ''}`
          : 'Sin pauta horaria registrada'}
      />
      <div className="border-t border-border">
        <div className={`grid gap-px bg-border ${showExecutionCard ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <div className="bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Próxima intervención
            </p>
            {nextPreventive ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{nextPreventive.task_name || 'Pauta configurada'}</p>
                  <Badge variant={nextPreventive.alert_due ? 'destructive' : 'outline'}>
                    {nextPreventive.alert_due
                      ? 'Vencido'
                      : String(nextPreventive.hour_status || '').toLowerCase() === 'pending'
                        ? 'Pendiente'
                        : nextPreventive.hour_status || 'Pendiente'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Horómetro actual:{' '}
                  {nextPreventive.effective_current_meter == null
                    ? 'sin lectura'
                    : `${number(nextPreventive.effective_current_meter, 1)} h`}
                  {' · '}
                  Vence:{' '}
                  {nextPreventive.due_meter == null
                    ? 'sin base'
                    : `${number(nextPreventive.due_meter, 1)} h`}
                </p>
                <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
                  <Link href="/dashboard/mantenimiento/preventivo-horas">
                    Abrir pauta
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No hay pauta horaria configurada para este equipo.
              </p>
            )}
          </div>

          {showExecutionCard ? (
            <div className="bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Trabajo en curso
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pasos pendientes</p>
                  <p className="mt-1 font-medium">{pendingPlanSteps}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Listas para cerrar</p>
                  <p className="mt-1 font-medium">{readyToClose}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Críticas abiertas</p>
                  <p className="mt-1 font-medium">{criticalOpen}</p>
                </div>
              </div>
              {actionableWorkOrder ? (
                <Button asChild size="sm" className="mt-4">
                  <Link
                    href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(
                      actionableWorkOrder.work_order_id,
                    )}`}
                  >
                    Continuar trabajo
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <details className="group border-t border-border px-5 py-4">
          <summary className="cursor-pointer list-none">
            <span className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Confiabilidad auditada</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {hasReliabilityEvidence
                    ? `MTBF ${mtbf} · MTTR ${mttr}`
                    : 'Sin cierres auditados suficientes para métricas de confiabilidad'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <IdentityItem icon={Timer} label="MTBF real" value={mtbf} />
            <IdentityItem icon={Timer} label="MTTR" value={mttr} />
            <IdentityItem
              icon={ShieldCheck}
              label="Cierres auditados"
              value={Number(reliability?.audited_closures || 0)}
            />
            <IdentityItem
              icon={AlertTriangle}
              label="Causas recurrentes"
              value={Number(reliability?.recurring_cause_count || 0)}
            />
          </div>
          <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
            <Link href="/dashboard/mantenimiento/confiabilidad">
              Ver confiabilidad
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </details>
      </div>
    </details>
  );
}
