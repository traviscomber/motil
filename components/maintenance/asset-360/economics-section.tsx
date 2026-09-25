// Sección "Economía" de la ficha 360 operacional.
// Extraída de asset-360-overview.tsx; consume las primitivas y helpers
// compartidos del mismo directorio.

import { CalendarDays, ChevronDown, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { date, money, number } from './format';
import { IdentityItem } from './primitives';
import type { Asset360OperationalState } from './availability-section';

export type Asset360EconomicHistoryRow = {
  fiscal_year?: number | null;
  movement_count?: number | string | null;
  historical_total_cost?: number | string | null;
  first_cost_date?: string | null;
  last_cost_date?: string | null;
};

export function Asset360EconomicsSection({
  economicHistory,
  operationalState,
  lastCostEventAt,
}: {
  economicHistory: Asset360EconomicHistoryRow[];
  operationalState: Asset360OperationalState | undefined;
  lastCostEventAt: string | null | undefined;
}) {
  const economicLifetime = economicHistory.reduce(
    (sum, row) => sum + Number(row.historical_total_cost || 0),
    0,
  );
  const economicMovementCount = economicHistory.reduce(
    (sum, row) => sum + Number(row.movement_count || 0),
    0,
  );
  const economicYearsWithMovements = economicHistory.filter(
    (row) => Number(row.movement_count || 0) > 0 || Number(row.historical_total_cost || 0) !== 0,
  ).length;
  const economicAnnualAverage =
    economicYearsWithMovements > 0 ? economicLifetime / economicYearsWithMovements : null;
  const economicFirstCostDate = economicHistory.length > 0
    ? economicHistory[economicHistory.length - 1]?.first_cost_date
    : null;
  const economicLastCostDate =
    economicHistory[0]?.last_cost_date ||
    lastCostEventAt ||
    operationalState?.last_cost_at ||
    null;
  const economicLifetimeValue = operationalState?.recognized_cost_clp_lifetime != null
    ? Number(operationalState.recognized_cost_clp_lifetime)
    : economicHistory.length > 0
      ? economicLifetime
      : null;
  const economicYtdValue = operationalState?.recognized_cost_clp_ytd != null
    ? Number(operationalState.recognized_cost_clp_ytd)
    : null;
  const economic12mValue = operationalState?.recognized_cost_clp_12m != null
    ? Number(operationalState.recognized_cost_clp_12m)
    : null;

  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="p-5">
        <div className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Economía</p>
            <h2 className="mt-1 text-lg font-semibold">Inversión en mantenimiento</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Gasto reconocido y enlazado al equipo. No equivale al costo total de propiedad.
            </p>
          </div>
          {economicLastCostDate ? (
            <p className="text-xs text-muted-foreground">Corte {date(economicLastCostDate)}</p>
          ) : null}
        </div>

        {economicLifetimeValue != null || economicHistory.length > 0 ? (
          <div>
            <div className="grid gap-4 py-5 sm:grid-cols-3">
              <IdentityItem
                icon={Coins}
                label="Histórico acumulado"
                value={economicLifetimeValue != null ? money(economicLifetimeValue) : 'Sin base'}
                meta={economicFirstCostDate ? `Desde ${date(economicFirstCostDate)}` : null}
              />
              <IdentityItem
                icon={CalendarDays}
                label="Últimos 12 meses"
                value={economic12mValue != null ? money(economic12mValue) : 'Sin base'}
                meta={economicLastCostDate ? `Corte ${date(economicLastCostDate)}` : null}
              />
              <IdentityItem
                icon={CalendarDays}
                label="Última imputación"
                value={date(economicLastCostDate)}
                meta={economicMovementCount > 0 ? `${economicMovementCount} movimientos reconocidos` : null}
              />
            </div>

            {(economicYtdValue != null || economicAnnualAverage != null || economicHistory.length > 0) ? (
              <details className="group border-t border-border pt-4">
                <summary className="cursor-pointer list-none">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">Detalle económico</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <IdentityItem
                    icon={CalendarDays}
                    label="Año en curso"
                    value={economicYtdValue != null ? money(economicYtdValue) : 'Sin base'}
                  />
                  <IdentityItem
                    icon={Coins}
                    label="Promedio anual"
                    value={economicAnnualAverage != null ? money(economicAnnualAverage) : 'Sin base'}
                    meta={economicYearsWithMovements > 0 ? `${economicYearsWithMovements} años con movimientos` : null}
                  />
                </div>
                {economicHistory.length > 0 ? (
                  <div className="mt-4 divide-y divide-border border-t border-border">
                    {economicHistory.slice(0, 6).map((row) => (
                      <div key={String(row.fiscal_year)} className="grid gap-3 py-3 sm:grid-cols-[100px_140px_minmax(0,1fr)] sm:items-center">
                        <p className="text-sm font-semibold">{row.fiscal_year || 'Sin año'}</p>
                        <p className="text-sm">{money(row.historical_total_cost)}</p>
                        <p className="text-xs text-muted-foreground">
                          {number(row.movement_count || 0, 0)} movimientos · {date(row.first_cost_date)} → {date(row.last_cost_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </details>
            ) : null}
          </div>
        ) : (
          <div className="py-5">
            <p className="text-sm font-medium">Sin historial de costos enlazado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No se registra inversión histórica de mantenimiento para este equipo en las fuentes disponibles. Esto no equivale a costo cero.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
