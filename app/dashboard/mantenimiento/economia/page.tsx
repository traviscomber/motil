'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, CircleDollarSign, Gauge, History, RefreshCw, Repeat2, Wrench } from 'lucide-react';
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
const year = (value: unknown) => typeof value === 'string' && value.length >= 4 ? value.slice(0, 4) : '—';
const percent = (part: unknown, total: unknown) => Number(total || 0) > 0 ? `${Math.round((Number(part || 0) / Number(total)) * 100)}%` : '—';

export default function MaintenanceEconomicsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/economics', fetcher, { revalidateOnFocus: false });
  const summary = data?.summary || {};
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  const historicalAnnual = Array.isArray(data?.historicalAnnual) ? data.historicalAnnual : [];
  const historicalAssets = Array.isArray(data?.historicalAssets) ? data.historicalAssets : [];
  const observedAnnual = Array.isArray(data?.observedCondition?.annual) ? data.observedCondition.annual : [];
  const topAssets = Array.isArray(data?.topAssets) ? data.topAssets : [];
  const rateAssets = Array.isArray(data?.costPerOperatingHour) ? data.costPerOperatingHour : [];
  const recurring = Array.isArray(data?.recurringCauses) ? data.recurringCauses : [];

  return <div className="mx-auto w-full max-w-[1600px] space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Mantenimiento · economía y confiabilidad</PageHeaderEyebrow>
        <PageHeaderTitle>Maintenance Economics</PageHeaderTitle>
        <PageHeaderDescription>Conecta siete años de costo reconocido con uso y condición observados, ejecución actual y cierres auditados. MOTIL separa evidencia histórica de diagnóstico: una coincidencia de costo y condición no se presenta como causa de falla.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className="h-4 w-4"/>Actualizar</Button>
        <Button asChild><Link href="/dashboard/mantenimiento/confiabilidad">Confiabilidad<ArrowRight className="h-4 w-4"/></Link></Button>
      </PageHeaderActions>
    </PageHeader>

    {error ? <StatePanel tone="error" title="No se pudo cargar Maintenance Economics" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/> : null}

    <section aria-label="Economía de mantenimiento" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Costo histórico reconocido" value={money(summary.historical_total_cost)} detail={`${year(summary.historical_first_date)}–${year(summary.historical_last_date)} · ${number(summary.historical_movements, 0)} movimientos`}/>
      <Metric label="Equipos con historia" value={summary.historical_assets} detail={`${summary.historical_inactive_assets ?? '—'} históricos/inactivos conservados`}/>
      <Metric label="Condición observada" value={number(summary.observed_condition_reports, 0)} detail={`${summary.observed_condition_assets ?? '—'} sondas · desde ${year(summary.observed_condition_first_date)}`}/>
      <Metric label="Costo OT auditado" value={money(summary.audited_total_cost)} detail={`${summary.audited_work_orders ?? '—'} cierres modernos con snapshot`}/>
    </section>

    {!isLoading && !error && actions.length > 0 ? <Card className="shadow-none">
      <CardHeader><CardTitle className="text-lg">Qué requiere atención ahora</CardTitle><CardDescription>Prioridades desde evidencia operacional actual. Ninguna acción diagnostica, reprioriza ni cierra una OT automáticamente.</CardDescription></CardHeader>
      <CardContent className="p-0"><div className="divide-y">{actions.map((action: any) => <Link key={action.key} href={action.href} className="grid gap-3 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <Badge variant={action.severity === 'critical' ? 'destructive' : action.severity === 'warning' ? 'secondary' : 'outline'}>{action.severity === 'critical' ? 'Crítico' : action.severity === 'warning' ? 'Atención' : 'Evidencia'}</Badge>
        <div><p className="font-medium">{action.title}</p><p className="mt-1 text-sm text-muted-foreground">{action.evidence}</p></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
      </Link>)}</div></CardContent>
    </Card> : null}

    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5"/>Historia económica canónica</CardTitle><CardDescription>Costo reconocido por año y activo canónico. Es evidencia financiera; no reconstruye fallas antiguas.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando historia" className="min-h-48 border-0 bg-transparent"/> : historicalAnnual.length === 0 ? <StatePanel tone="neutral" title="Sin historia económica vinculada" className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{historicalAnnual.map((row: any) => <div key={row.fiscal_year} className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-4 p-4"><div><p className="font-semibold tabular-nums">{row.fiscal_year}</p><p className="text-xs text-muted-foreground">{row.asset_count} equipos</p></div><div className="h-1.5 overflow-hidden bg-muted"><div className="h-full bg-foreground/70" style={{ width: `${Math.max(4, Math.min(100, (Number(row.historical_total_cost || 0) / Math.max(...historicalAnnual.map((item: any) => Number(item.historical_total_cost || 0)), 1)) * 100))}%` }}/></div><div className="text-right"><p className="font-medium tabular-nums">{money(row.historical_total_cost)}</p><p className="text-xs text-muted-foreground">{number(row.movement_count, 0)} movimientos</p></div></div>)}</div>}</CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5"/>Condición operacional observada</CardTitle><CardDescription>Reportes productivos de sondas desde {year(data?.observedCondition?.first_report_at)}. “Fuera de servicio” u “observaciones” describen el reporte; no equivalen a causa mecánica.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando condición" className="min-h-48 border-0 bg-transparent"/> : observedAnnual.length === 0 ? <StatePanel tone="neutral" title="Sin evidencia operacional comparable" className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{observedAnnual.map((row: any) => <div key={row.fiscal_year} className="p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{row.fiscal_year}</p><p className="mt-1 text-xs text-muted-foreground">{row.observed_asset_count} equipos · {number(row.drilled_meters)} m reportados</p></div><p className="text-sm tabular-nums">{number(row.observed_report_count, 0)} reportes</p></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Condition label="Operativo" value={row.operational_reports}/><Condition label="Con observación" value={row.observation_reports}/><Condition label="Fuera servicio" value={row.out_of_service_reports}/></div><p className="mt-2 text-xs text-muted-foreground">{number(row.external_constraint_reports, 0)} reportes incluyen señal externa de dotación, agua o energía; pueden superponerse con el estado del equipo.</p></div>)}</div>}</CardContent>
      </Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CircleDollarSign className="h-5 w-5"/>Equipos con mayor historia económica</CardTitle><CardDescription>Ranking descriptivo por costo reconocido. Cuando existe producción vinculada, se muestra la mezcla de condición observada sin atribuir causalidad.</CardDescription></CardHeader>
      <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando equipos" className="min-h-48 border-0 bg-transparent"/> : historicalAssets.length === 0 ? <StatePanel tone="neutral" title="Sin equipos con historia vinculada" className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{historicalAssets.map((row: any) => {
        const observed = row.observed_condition;
        const degraded = Number(observed?.observation_reports || 0) + Number(observed?.out_of_service_reports || 0);
        return <Link key={row.canonical_asset_id} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}/ficha`} className="grid gap-3 p-4 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{number(row.movement_count, 0)} movimientos · {year(row.first_cost_date)}–{year(row.last_cost_date)}{row.is_active ? '' : ' · histórico/inactivo'}</p></div><div className="md:text-right"><p className="font-semibold tabular-nums">{money(row.historical_total_cost)}</p><p className="text-xs text-muted-foreground">costo reconocido</p></div><div className="min-w-36 md:text-right">{observed ? <><p className="text-sm font-medium">{number(observed.report_count, 0)} reportes</p><p className="text-xs text-muted-foreground">{percent(degraded, observed.report_count)} con condición degradada reportada</p></> : <p className="text-xs text-muted-foreground">Sin uso observado vinculado</p>}</div></Link>;
      })}</div>}</CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CircleDollarSign className="h-5 w-5"/>Equipos por costo OT auditado</CardTitle><CardDescription>Economía moderna explicable sólo con cierres auditados. No suma automáticamente la historia financiera anterior.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando costos" className="min-h-48 border-0 bg-transparent"/> : topAssets.length === 0 ? <StatePanel tone="neutral" title="Aún no hay base económica auditada" description="Cierra OT operacionales con costo trazable para habilitar ranking por equipo." className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{topAssets.map((row: any) => <Link key={row.canonical_asset_id} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}/ficha`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{row.audited_closures} cierres · detención {number(row.total_downtime_hours)} h</p></div><p className="font-semibold tabular-nums">{money(row.audited_total_cost)}</p></Link>)}</div>}</CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5"/>Costo por hora operativa</CardTitle><CardDescription>Disponible sólo con horómetro utilizable y costo auditado del mismo activo.</CardDescription></CardHeader>
        <CardContent className="p-0">{isLoading ? <StatePanel tone="loading" title="Cargando tasas" className="min-h-48 border-0 bg-transparent"/> : rateAssets.length === 0 ? <StatePanel tone="neutral" title="Todavía no hay costo/hora defendible" description="La cobertura de horómetro debe crecer antes de comparar equipos por costo unitario." actions={<Button asChild variant="outline"><Link href="/dashboard/mantenimiento/horometros">Revisar horómetros</Link></Button>} className="min-h-48 border-0 bg-transparent"/> : <div className="divide-y">{rateAssets.map((row: any) => <Link key={row.canonical_asset_id} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}/ficha`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{number(row.observed_operating_hours)} h observadas · {row.audited_closures} cierres</p></div><p className="font-semibold tabular-nums">{money(row.audited_cost_per_operating_hour)}/h</p></Link>)}</div>}</CardContent>
      </Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Repeat2 className="h-5 w-5"/>Causas raíz recurrentes auditadas</CardTitle><CardDescription>La misma causa raíz observada al menos dos veces en el mismo activo. Sirve para revisar estrategia, no para predecir una falla futura.</CardDescription></CardHeader>
      <CardContent className="p-0">{!isLoading && recurring.length === 0 ? <StatePanel tone="neutral" title="Sin recurrencias auditadas todavía" description="Se necesitan cierres con causa raíz trazable antes de detectar repetición." className="min-h-40 border-0 bg-transparent"/> : <div className="divide-y">{recurring.map((row: any) => <Link key={`${row.canonical_asset_id}-${row.root_cause_key}`} href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}/ficha`} className="grid gap-2 p-4 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo'}</p><p className="mt-1 text-sm text-muted-foreground">{row.root_cause}</p></div><div className="text-right"><p className="font-semibold">{row.occurrences} veces</p><p className="text-xs text-muted-foreground">{money(row.audited_total_cost)}</p></div></Link>)}</div>}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base">Reglas de lectura</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-3"><Rule title="Costo histórico">Describe gasto reconocido. No explica por sí solo una falla, una causa ni una intervención.</Rule><Rule title="Condición observada">Resume estados reportados y restricciones externas. No es probabilidad de falla ni diagnóstico mecánico.</Rule><Rule title="Costo auditado">Sólo un cierre moderno con evidencia permite relacionar causa, horas, detención y costo ejecutado.</Rule></CardContent>
    </Card>

    <div className="grid gap-3 text-sm md:grid-cols-3">
      <Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><Wrench className="h-5 w-5"/><p className="mt-3 font-medium">Cerrar bien las OT</p><p className="mt-1 text-xs text-muted-foreground">Causa, horas, evidencia y costo construyen la explicación futura.</p></Link>
      <Link href="/dashboard/mantenimiento/horometros" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><Gauge className="h-5 w-5"/><p className="mt-3 font-medium">Mejorar runtime</p><p className="mt-1 text-xs text-muted-foreground">Sin horas observadas no hay costo/hora ni MTBF defendible.</p></Link>
      <Link href="/dashboard/mantenimiento/decision-intelligence" className="rounded-lg border bg-card p-4 hover:bg-muted/40"><AlertTriangle className="h-5 w-5"/><p className="mt-3 font-medium">Convertir evidencia en decisión</p><p className="mt-1 text-xs text-muted-foreground">Priorizar revisión o intervención manteniendo autoridad humana.</p></Link>
    </div>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: unknown; detail: string }) {
  return <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-tight tabular-nums">{value == null ? '—' : String(value)}</p><p className="max-w-44 text-right text-xs leading-4 text-muted-foreground">{detail}</p></div></div>;
}

function Condition({ label, value }: { label: string; value: unknown }) {
  return <div className="bg-muted/50 px-2 py-2"><p className="text-muted-foreground">{label}</p><p className="mt-1 font-medium tabular-nums">{number(value, 0)}</p></div>;
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{children}</p></div>;
}
