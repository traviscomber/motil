'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CircleDollarSign, Gauge, RefreshCw, Repeat2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Maintenance Economics');
  return payload;
};

const number = (value: unknown, digits = 1) => value == null ? '—' : new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(Number(value));
const money = (value: unknown) => value == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value));

export default function MaintenanceEconomicsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/economics', fetcher, { revalidateOnFocus: false });
  const summary = data?.summary || {};
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  const topAssets = Array.isArray(data?.topAssets) ? data.topAssets : [];
  const rateAssets = Array.isArray(data?.costPerOperatingHour) ? data.costPerOperatingHour : [];
  const recurring = Array.isArray(data?.recurringCauses) ? data.recurringCauses : [];

  return <div className="mx-auto w-full max-w-[1600px] space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Mantenimiento · economía y confiabilidad</PageHeaderEyebrow>
        <PageHeaderTitle>Maintenance Economics</PageHeaderTitle>
        <PageHeaderDescription>Convierte OT, horómetros, causas y costos auditados en decisiones sobre disponibilidad y costo de mantener la operación. Si falta evidencia, MOTIL lo muestra como desconocido en vez de inventar un KPI.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className="h-4 w-4"/>Actualizar</Button>
        <Button asChild><Link href="/dashboard/mantenimiento/confiabilidad">Confiabilidad<ArrowRight className="h-4 w-4"/></Link></Button>
      </PageHeaderActions>
    </PageHeader>

    {error ? <StatePanel tone="error" title="No se pudo cargar Maintenance Economics" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/> : null}

    <section aria-label="Economía de mantenimiento" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="OT abiertas" value={summary.open_work_orders} detail={`${summary.unassigned_open_work_orders ?? '—'} sin responsable canónico`}/>
      <Metric label="Bloqueos operacionales" value={summary.operational_blockers} detail="Sólo bloqueos técnicos/operacionales"/>
      <Metric label="Costo auditado" value={money(summary.audited_total_cost)} detail={`${summary.audited_work_orders ?? '—'} cierres con snapshot`}/>
      <Metric label="Costo/hora disponible" value={summary.assets_with_cost_per_operating_hour} detail={`${summary.runtime_usable_assets ?? '—'}/${summary.runtime_assets ?? '—'} activos con runtime utilizable`}/>
    </section>

    {!isLoading && !error && actions.length > 0 ? <Card className="shadow-none">
      <CardHeader><CardTitle className="text-lg">Qué mueve el costo ahora</CardTitle><CardDescription>Prioridades determinísticas desde evidencia operacional; ninguna acción cambia una OT automáticamente.</CardDescription></CardHeader>
      <CardContent className="p-0"><div className="divide-y">{actions.map((action: any) => <Link key={action.key} href={action.href} className="grid gap-3 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <Badge variant={action.severity === 'critical' ? 'destructive' : action.severity === 'warning' ? 'secondary' : 'outline'}>{action.severity === 'critical' ? 'Crítico' : action.severity === 'warning' ? 'Atención' : 'Evidencia'}</Badge>
        <div><p className="font-medium">{action.title}</p><p className="mt-1 text-sm text-muted-foreground">{action.evidence}</p></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
      </Link>)}</div></CardContent>
    </Card> : null}

    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CircleDollarSign className="h-5 w-5"/>Equipos por costo auditado</CardTitle><CardDescription>Ranking sólo cuando existen cierres auditados. No mezcla OT históricas sin snapshot.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando costos" className="min-h-48 border-0 bg-transparent"/> : topAssets.length === 0 ? <StatePanel tone="neutral" title="Aún no hay base económica auditada" description="Cierra OT operacionales con costo trazable para habilitar ranking por equipo." className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{topAssets.map((row: any) => <Link key={row.canonical_asset_id} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{row.audited_closures} cierres · detención {number(row.total_downtime_hours)} h</p></div><p className="font-semibold tabular-nums">{money(row.audited_total_cost)}</p></Link>)}</div>}</CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5"/>Costo por hora operativa</CardTitle><CardDescription>Disponible sólo con horómetro utilizable y costo auditado del mismo activo.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando tasas" className="min-h-48 border-0 bg-transparent"/> : rateAssets.length === 0 ? <StatePanel tone="neutral" title="Todavía no hay costo/hora defendible" description="La cobertura de horómetro debe crecer antes de comparar equipos por costo unitario." actions={<Button asChild variant="outline"><Link href="/dashboard/mantenimiento/horometros">Revisar horómetros</Link></Button>} className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{rateAssets.map((row: any) => <Link key={row.canonical_asset_id} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{number(row.observed_operating_hours)} h observadas · {row.audited_closures} cierres</p></div><p className="font-semibold tabular-nums">{money(row.audited_cost_per_operating_hour)}/h</p></Link>)}</div>}</CardContent>
      </Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Repeat2 className="h-5 w-5"/>Fallas recurrentes</CardTitle><CardDescription>La misma causa raíz observada al menos dos veces en el mismo activo. Sirve para revisar estrategia, no para predecir una falla futura.</CardDescription></CardHeader>
      <CardContent className="p-0">{!isLoading && recurring.length === 0 ? <StatePanel tone="neutral" title="Sin recurrencias auditadas todavía" description="Se necesitan cierres con causa raíz trazable antes de detectar repetición." className="min-h-40 border-0 bg-transparent"/> : <div className="divide-y">{recurring.map((row: any) => <Link key={`${row.canonical_asset_id}-${row.root_cause_key}`} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}`} className="grid gap-2 p-4 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-sm text-muted-foreground">{row.root_cause}</p></div><div className="text-right"><p className="font-semibold">{row.occurrences} veces</p><p className="text-xs text-muted-foreground">{money(row.audited_total_cost)}</p></div></Link>)}</div>}</CardContent>
    </Card>

    <div className="grid gap-3 text-sm md:grid-cols-3">
      <Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><Wrench className="h-5 w-5"/><p className="mt-3 font-medium">Cerrar bien las OT</p><p className="mt-1 text-xs text-muted-foreground">Causa, horas, evidencia y costo alimentan la economía real.</p></Link>
      <Link href="/dashboard/mantenimiento/horometros" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><Gauge className="h-5 w-5"/><p className="mt-3 font-medium">Mejorar runtime</p><p className="mt-1 text-xs text-muted-foreground">Sin horas observadas no hay costo/hora ni MTBF defendible.</p></Link>
      <Link href="/dashboard/mantenimiento/decision-intelligence" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><AlertTriangle className="h-5 w-5"/><p className="mt-3 font-medium">Convertir evidencia en decisión</p><p className="mt-1 text-xs text-muted-foreground">Priorizar intervención, estrategia o seguimiento sin escritura autónoma.</p></Link>
    </div>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: unknown; detail: string }) {
  return <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-tight tabular-nums">{value == null ? '—' : String(value)}</p><p className="max-w-40 text-right text-xs leading-4 text-muted-foreground">{detail}</p></div></div>;
}
