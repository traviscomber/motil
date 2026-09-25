// Sección "Historial de mantención" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { ChevronDown } from 'lucide-react';
import { date, money } from './format';
import { SectionSummary } from './primitives';

export type Asset360RecentEvent = {
  id: string;
  work_order_id?: string | null;
  event_type?: string | null;
  event_at?: string | null;
  actor_name?: string | null;
  summary?: string | null;
};

export type Asset360AuditedIntervention = {
  id: string;
  work_order_id: string;
  closure_sequence?: number | null;
  parts_cost?: number | string | null;
  labor_cost?: number | string | null;
  effective_external_cost?: number | string | null;
  total_cost?: number | string | null;
  closed_at?: string | null;
  workOrder?: {
    id: string;
    work_order_number?: string | null;
    title?: string | null;
    status?: string | null;
    priority?: string | null;
    work_type?: string | null;
    scheduled_date?: string | null;
    start_date?: string | null;
    completion_date?: string | null;
    root_cause?: string | null;
    preventive_actions?: string | null;
    actual_duration_hours?: number | string | null;
  } | null;
};

export function Asset360HistorySection({
  auditedInterventions,
  recentEvents,
}: {
  auditedInterventions: Asset360AuditedIntervention[];
  recentEvents: Asset360RecentEvent[];
}) {
  if (auditedInterventions.length === 0 && recentEvents.length === 0) return null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <SectionSummary
        title="Historial de mantención"
        hint={auditedInterventions.length > 0
          ? `${auditedInterventions.length} cierres auditados`
          : `${recentEvents.length} eventos recientes`}
      />
      <div className="border-t border-border">
        {auditedInterventions.length > 0 ? (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Últimas intervenciones auditadas
            </p>
            <div className="mt-3 divide-y divide-border">
              {auditedInterventions.slice(0, 3).map((item) => (
                <div key={item.id} className="grid gap-3 py-4 lg:grid-cols-[140px_minmax(0,1fr)_140px] lg:items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{date(item.closed_at || item.workOrder?.completion_date)}</p>
                    <p className="mt-1 font-mono text-xs">{item.workOrder?.work_order_number || 'OT sin número'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.workOrder?.title || item.workOrder?.work_type || 'Mantención cerrada'}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.workOrder?.root_cause || item.workOrder?.preventive_actions || 'Sin causa o acción documentada'}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="mt-1 text-sm font-medium">{money(item.total_cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">Sin cierres auditados.</div>
        )}

        {recentEvents.length > 0 || auditedInterventions.length > 3 ? (
          <details className="group border-t border-border px-4 py-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Más historial</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Eventos recientes y cierres anteriores
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
            </summary>
            {auditedInterventions.length > 3 ? (
              <div className="mt-4 divide-y divide-border border-t border-border pt-1">
                {auditedInterventions.slice(3, 6).map((item) => (
                  <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[120px_minmax(0,1fr)_120px] sm:items-center">
                    <span className="text-xs text-muted-foreground">{date(item.closed_at || item.workOrder?.completion_date)}</span>
                    <span className="truncate text-sm font-medium">{item.workOrder?.title || item.workOrder?.work_type || 'Mantención cerrada'}</span>
                    <span className="text-sm font-medium sm:text-right">{money(item.total_cost)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {recentEvents.length > 0 ? (
              <div className={auditedInterventions.length > 3 ? 'border-t border-border pt-3' : 'mt-4 border-t border-border pt-3'}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Actividad reciente</p>
                <div className="mt-2 divide-y divide-border">
                  {recentEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[120px_minmax(0,1fr)_180px] sm:items-center">
                      <span className="text-xs text-muted-foreground">{date(event.event_at)}</span>
                      <span className="text-sm font-medium">{event.summary || event.event_type || 'Evento de mantenimiento'}</span>
                      <span className="text-xs text-muted-foreground sm:text-right">{event.actor_name || 'Actor no informado'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </details>
        ) : null}
      </div>
    </details>
  );
}
