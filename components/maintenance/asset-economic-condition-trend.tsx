'use client';

import useSWR from 'swr';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la comparación temporal');
  return payload;
};

const money = (value: unknown) => value == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value));
const number = (value: unknown, digits = 1) => value == null ? '—' : new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(Number(value));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value)}T00:00:00Z`)) : '—';

function Direction({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-muted-foreground">Sin base comparable</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return <span className="inline-flex items-center gap-1 tabular-nums"><Icon className="h-4 w-4" />{value > 0 ? '+' : ''}{number(value)}{suffix}</span>;
}

export function AssetEconomicConditionTrend({ assetId }: { assetId: string }) {
  const { data, error, isLoading } = useSWR(`/api/maintenance/assets/${encodeURIComponent(assetId)}/economic-condition-trend`, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Comparando ventanas de 12 meses" />;
  if (error) return <StatePanel tone="error" title="No se pudo comparar costo y condición" description={error.message} />;
  if (!data) return null;

  const comparison = data.comparison || {};
  const recent = data.recent || {};
  const prior = data.prior || {};
  const comparable = Boolean(comparison.comparable);
  const alignmentLabel = comparison.descriptive_alignment === 'both_up'
    ? 'Costo y condición reportada aumentan en la misma ventana'
    : comparison.descriptive_alignment === 'both_down'
      ? 'Costo y condición reportada disminuyen en la misma ventana'
      : comparison.descriptive_alignment === 'both_flat'
        ? 'Sin cambio material en ambas señales'
        : comparison.descriptive_alignment === 'mixed'
          ? 'Las señales se mueven en direcciones distintas'
          : 'Aún no hay base comparable';

  return <Card className="shadow-none">
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5"/>Tendencia costo + condición</CardTitle>
          <CardDescription className="mt-1">Compara dos ventanas consecutivas de 12 meses. Describe cambios observados; no diagnostica causa ni predice fallas.</CardDescription>
        </div>
        <Badge variant={comparable ? 'outline' : 'secondary'}>{comparable ? 'Base comparable' : 'Cobertura insuficiente'}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-2">
        <Window title="12 meses anteriores" from={data.period?.prior?.from} to={data.period?.prior?.to} value={prior} />
        <Window title="Últimos 12 meses" from={data.period?.recent?.from} to={data.period?.recent?.to} value={recent} />
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Cambio de gasto reconocido</p>
          <p className="mt-2 text-xl font-semibold"><Direction value={comparison.cost_change_percent ?? null} /></p>
        </div>
        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Cambio en proporción de reportes con condición degradada</p>
          <p className="mt-2 text-xl font-semibold"><Direction value={comparison.degraded_share_change_percentage_points ?? null} suffix=" pp" /></p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-medium">{alignmentLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">Coincidencia temporal no implica causalidad. Agua, energía o falta de dotación se muestran por separado y no se clasifican como falla mecánica.</p>
        {comparison.descriptive_alignment === 'both_up' ? <p className="mt-3 flex items-start gap-2 text-sm"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0"/>Siguiente acción: revisar observaciones repetidas y capturar causa, horas, detención y costo auditado en la próxima OT relevante.</p> : null}
      </div>
    </CardContent>
  </Card>;
}

function Window({ title, from, to, value }: { title: string; from: string; to: string; value: any }) {
  return <div className="rounded-lg border p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{date(from)} → {date(to)}</p></div>
      <p className="font-semibold tabular-nums">{money(value.cost)}</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div><p className="text-xs text-muted-foreground">Reportes</p><p className="mt-1 font-medium tabular-nums">{number(value.reports, 0)}</p></div>
      <div><p className="text-xs text-muted-foreground">Condición degradada</p><p className="mt-1 font-medium tabular-nums">{number(value.degraded_share_percent)}%</p></div>
      <div><p className="text-xs text-muted-foreground">Restricciones externas</p><p className="mt-1 font-medium tabular-nums">{number(value.external_constraints, 0)}</p></div>
    </div>
  </div>;
}
