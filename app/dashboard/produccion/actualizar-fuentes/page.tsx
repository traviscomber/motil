'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, DatabaseZap, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type HealthStatus = 'healthy' | 'watch' | 'critical' | 'unknown';
type Metric = { label: string; value: string | number | null; ageDays?: number | null };
type Domain = { key: string; label: string; status: HealthStatus; headline: string; metrics: Metric[]; action: string; href: string };
type HealthResponse = { domains: Domain[]; generatedAt: string; policy: { freshnessWatchDays: number; freshnessCriticalDays: number } };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo evaluar la frescura de Producción');
  return payload as HealthResponse;
};

const labels: Record<HealthStatus, string> = { healthy: 'Vigente', watch: 'Atrasada', critical: 'Crítica', unknown: 'Sin evidencia' };

function statusFromAge(ageDays: number | null | undefined, watch: number, critical: number): HealthStatus {
  if (ageDays === null || ageDays === undefined) return 'unknown';
  if (ageDays > critical) return 'critical';
  if (ageDays > watch) return 'watch';
  return 'healthy';
}

function dateLabel(value: Metric['value']) {
  if (!value) return 'Sin dato';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(`${value}T00:00:00`).toLocaleDateString('es-CL');
  return String(value);
}

export default function ProductionFreshnessWorkspace() {
  const searchParams = useSearchParams();
  const requestedSource = searchParams.get('source');
  const focusedSource = ['transport', 'plant', 'drilling'].includes(String(requestedSource || ''))
    ? String(requestedSource)
    : null;
  const { data, error, isLoading, mutate } = useSWR<HealthResponse>('/api/data-quality/health', fetcher, { revalidateOnFocus: false });
  const production = data?.domains.find((domain) => domain.key === 'production');
  const watch = data?.policy.freshnessWatchDays ?? 7;
  const critical = data?.policy.freshnessCriticalDays ?? 14;
  const sources = [
    { key: 'transport', name: 'Transporte', prefix: 'Transporte', href: '/dashboard/produccion/importacion-maestra', action: 'Actualizar con master canónico' },
    { key: 'plant', name: 'Planta', prefix: 'Planta', href: '/dashboard/produccion/importacion-maestra', action: 'Actualizar con master canónico' },
    { key: 'drilling', name: 'Sondaje', prefix: 'Sondaje', href: '/dashboard/produccion/sondaje/produccion', action: 'Revisar fuente de Sondaje' },
  ].map((source) => {
    const metric = production?.metrics.find((item) => item.label.startsWith(source.prefix));
    const status = statusFromAge(metric?.ageDays, watch, critical);
    return { ...source, metric, status };
  });
  const visibleSources = focusedSource
    ? sources.filter((source) => source.key === focusedSource)
    : sources;
  const focusedLabel = visibleSources[0]?.name || null;

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Producción · Data Health</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{focusedLabel ? `Actualizar fuente de ${focusedLabel}` : 'Actualizar fuentes operacionales'}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{focusedLabel ? `Esta vista muestra sólo la fuente que originó la tarea. La deuda se cierra únicamente cuando existe evidencia canónica más reciente para ${focusedLabel}.` : 'Separa la deuda de frescura por fuente. Transporte y Planta comparten el master canónico; Sondaje mantiene su propia fuente y no se actualiza desde ese archivo.'}</p>
      </div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/calidad-datos/salud?domain=production&issue=freshness">Data Health</Link></Button><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar estado</Button></div>
    </section>

    {error ? <StatePanel tone="error" title="No fue posible leer la frescura de Producción" description={error.message} /> : null}
    {isLoading ? <StatePanel tone="loading" title="Consultando fuentes canónicas" /> : null}

    {!isLoading && !error ? <>
      <section className="grid gap-4 lg:grid-cols-3">
        {visibleSources.map((source) => <Card key={source.key} className={source.status === 'critical' ? 'border-destructive/40 shadow-none' : 'shadow-none'}>
          <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><DatabaseZap className="h-4 w-4" />{source.name}</CardTitle><Badge variant={source.status === 'critical' ? 'destructive' : 'outline'}>{labels[source.status]}</Badge></div></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-xs text-muted-foreground">Último dato canónico</p><p className="mt-1 font-medium">{dateLabel(source.metric?.value ?? null)}</p>{typeof source.metric?.ageDays === 'number' ? <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{source.metric.ageDays} día{source.metric.ageDays === 1 ? '' : 's'} de antigüedad</p> : null}</div>
            {source.key === 'drilling' ? <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">El master histórico Motil no contiene Sondaje. Esta fuente debe actualizarse por su flujo propio; Motil no marca frescura resuelta por abrir esta pantalla.</div> : <div className="rounded-lg border p-3 text-xs text-muted-foreground">El master canónico valida SHA-256, lineage y conteos antes de materializar Transporte y Planta.</div>}
            <Button asChild className="w-full" variant={source.status === 'critical' ? 'default' : 'outline'}><Link href={source.href}>{source.action}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>)}
      </section>

      <Card className="shadow-none"><CardContent className="flex gap-3 p-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="font-medium">La frescura se resuelve con evidencia nueva</p><p className="mt-1 text-muted-foreground">Abrir un módulo no modifica la fecha de la fuente. El estado cambia sólo cuando se materializan registros nuevos y Data Health vuelve a leer una fecha canónica más reciente.</p></div></CardContent></Card>

      {visibleSources.every((source) => source.status === 'healthy') ? <Card className="shadow-none"><CardContent className="flex gap-3 p-4 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="font-medium">Fuentes dentro de ventana de frescura</p><p className="mt-1 text-muted-foreground">No hay una actualización de calidad prioritaria para Transporte, Planta o Sondaje.</p></div></CardContent></Card> : null}
    </> : null}
  </div>;
}
