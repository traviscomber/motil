// Sección "Materiales y repuestos" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { ChevronDown } from 'lucide-react';
import { date, money, number } from './format';
import { SectionSummary } from './primitives';

export type Asset360PartsRow = {
  id: string;
  quantity_requested?: number | null;
  quantity_issued?: number | null;
  quantity_installed?: number | null;
  quantity_returned?: number | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  status?: string | null;
  installed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;
  product?: {
    id: string;
    product_code?: string | null;
    name?: string | null;
    unit?: string | null;
  } | null;
  workOrder?: {
    id: string;
    work_order_number?: string | null;
    title?: string | null;
  } | null;
};

export function Asset360MaterialsSection({
  hasMaterialEvidence,
  pendingParts,
  installedParts,
  latestPlanPartsStatus,
}: {
  hasMaterialEvidence: boolean;
  pendingParts: Asset360PartsRow[];
  installedParts: Asset360PartsRow[];
  latestPlanPartsStatus?: string | null;
}) {
  if (!hasMaterialEvidence) return null;

  return (
    <details className="group rounded-lg border border-border bg-card" open={pendingParts.length > 0}>
      <SectionSummary
        title="Materiales y repuestos"
        hint={pendingParts.length > 0
          ? `${pendingParts.length} pendientes`
          : installedParts.length > 0
            ? `${installedParts.length} instalados`
            : 'Sin repuestos vinculados'}
      />
      <div className="border-t border-border">
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Pendientes</p>
          {pendingParts.length > 0 ? (
            <div className="mt-3 divide-y divide-border">
              {pendingParts.slice(0, 4).map((part) => {
                const pending = Math.max(
                  Number(part.quantity_requested || 0) -
                    Number(part.quantity_installed || 0) -
                    Number(part.quantity_returned || 0),
                  0,
                );
                return (
                  <div key={part.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {part.product?.name || part.product?.product_code || 'Repuesto sin nombre'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {part.workOrder?.work_order_number || 'OT no informada'} · {part.status || 'Pendiente'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{number(pending, 0)} {part.product?.unit || ''}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Solicitado {number(part.quantity_requested || 0, 0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : latestPlanPartsStatus ? (
            <p className="mt-3 text-sm">{latestPlanPartsStatus}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No hay materiales pendientes asociados al equipo.</p>
          )}
        </div>

        {installedParts.length > 0 ? (
          <details className="group border-t border-border px-4 py-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Historial instalado</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {installedParts.length} registros de repuestos
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-3 divide-y divide-border border-t border-border pt-1">
              {installedParts.slice(0, 8).map((part) => (
                <div key={part.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {part.product?.name || part.product?.product_code || 'Repuesto sin nombre'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {part.workOrder?.work_order_number || 'OT no informada'} · {date(part.installed_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{number(part.quantity_installed || 0, 0)} {part.product?.unit || ''}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {part.total_cost != null
                        ? money(part.total_cost)
                        : part.unit_cost != null
                          ? money(Number(part.unit_cost) * Number(part.quantity_installed || 0))
                          : 'Sin costo'}
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
