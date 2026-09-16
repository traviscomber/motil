'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CircleDollarSign, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type AnnualRow = { year: number; event_count: number; recognized_clp: number };
type CompositionRow = { event_type: string; event_count: number; recognized_clp: number };
type Signal = { key: string; severity: 'high' | 'medium' | 'info'; fact: string; next_action: string; href: string };
type Response = {
  historicalEconomics: {
    recognized_event_count: number;
    recognized_clp: number;
    first_event_at: string | null;
    last_event_at: string | null;
    years_with_evidence: number;
    ledger_events_with_work_order: number;
    annual: AnnualRow[];
    composition: CompositionRow[];
    truncated: boolean;
  };
  currentExecution: {
    active_work_orders: number;
    critical_open: number;
    operational_blockers: number;
    overdue_preventives: number;
    meter_basis_conflicts: number;
  };
  auditedReliability: null | {
    audited_closures: number;
    closures_with_root_cause: number;
    root_cause_coverage_percent: number | null;
    recurring_cause_count: number;
    audited_total_cost: number;
    total_downtime_hours: number;
  };
  identityReadiness: {
    validation_status: string | null;
    technical_fields_known: number;
    technical_fields_total: number;
    has_cost_center: boolean;
  };
  signals: Signal[];
  semantics: Record<string, string>;
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la historia económica-operacional');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown, digits = 0) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(Number(value || 0));
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat('es-CL', { year: 'numeric', month: 'short' }).format(new Date(value)) : 'Sin fecha';

export function AssetEconomicOperationalHistory({ assetId }: { assetId: string }) {
  const { data, error, isLoading, mutate } = useSWR<Response>(assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/economic-operational-history` : null, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Construyendo historia económica-operacional" description="Conectando ledger canónico, ejecución actual, identidad técnica y confiabilidad auditada." />;
  if (error || !data) return <StatePanel tone="error" title="No fue posible cargar la historia económica-operacional" description={error instanceof Error ? error.message : 'No hay datos disponibles.'} actions={<Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4"/>Reintentar</Button>} />;

  const historical = data.historicalEconomics;
  const reliability = data.auditedReliability;
  const topYear = [...historical.annual].sort((a, b) => b.recognized_clp - a.recognized_clp)[0] || null;
  const signalCount = data.signals.length;

  return <Card className="shadow-none">
    <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
      <div>
        <CardTitle className="text-lg">Historia económica-operacional</CardTitle>
        <CardDescription>Responde por qué el equipo cuesta lo que cuesta y qué evidencia operacional requiere atención, sin convertir gasto histórico en fallas inventadas.</CardDescription>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{historical.years_with_evidence} años con evidencia</Badge>
        {signalCount > 0 ? <Badge variant="secondary">{signalCount} señal(es)</Badge> : <Badge variant="outline">Sin señales actuales</Badge>}
      </div>
    </CardHeader>
    <CardContent className="space-y-6 pt-5">
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen económico-operacional">
        <Metric label="Costo histórico reconocido" value={money(historical.recognized_clp)} detail={`${number(historical.recognized_event_count)} eventos canónicos`} />
        <Metric label="Cobertura histórica" value={`${shortDate(historical.first_event_at)} → ${shortDate(historical.last_event_at)}`} detail={`${historical.years_with_evidence} año(s) con gasto identificado`} />
        <Metric label="Costo moderno auditado" value={reliability && reliability.audited_closures > 0 ? money(reliability.audited_total_cost) : 'Sin base'} detail={reliability ? `${reliability.audited_closures} cierre(s) auditado(s)` : 'Aún sin cierres auditados'} />
        <Metric label="Ejecución actual" value={data.currentExecution.active_work_orders} detail={`${data.currentExecution.critical_open} crítica(s) · ${data.currentExecution.operational_blockers} bloqueo(s)`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Evolución anual del gasto</h3>
            <p className="mt-1 text-xs text-muted-foreground">Sólo eventos reconocidos ya vinculados al activo canónico.</p>
          </div>
          <div className="divide-y">
            {historical.annual.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Este equipo todavía no tiene historia económica vinculada.</p> : historical.annual.map((row) => {
              const max = Math.max(...historical.annual.map((item) => item.recognized_clp), 1);
              const width = Math.max(3, Math.round((row.recognized_clp / max) * 100));
              return <div key={row.year} className="grid gap-3 px-4 py-3 md:grid-cols-[72px_minmax(0,1fr)_150px] md:items-center">
                <div><p className="font-medium tabular-nums">{row.year}</p><p className="text-xs text-muted-foreground">{number(row.event_count)} eventos</p></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground/70" style={{ width: `${width}%` }} /></div>
                <p className="text-right font-medium tabular-nums">{money(row.recognized_clp)}</p>
              </div>;
            })}
          </div>
          {topYear ? <div className="border-t px-4 py-3 text-xs text-muted-foreground">Año con mayor gasto observado: <span className="font-medium text-foreground">{topYear.year} · {money(topYear.recognized_clp)}</span>. Esto describe gasto, no causa de falla.</div> : null}
        </section>

        <section className="rounded-lg border">
          <div className="border-b px-4 py-3"><h3 className="font-medium">Qué sabemos de la causa</h3><p className="mt-1 text-xs text-muted-foreground">La historia económica se mantiene separada de la evidencia técnica moderna.</p></div>
          <div className="space-y-4 p-4 text-sm">
            <EvidenceRow label="Eventos históricos ligados a OT" value={`${number(historical.ledger_events_with_work_order)} / ${number(historical.recognized_event_count)}`} />
            <EvidenceRow label="Cierres modernos auditados" value={number(reliability?.audited_closures || 0)} />
            <EvidenceRow label="Cobertura de causa raíz" value={reliability?.root_cause_coverage_percent == null ? 'Sin base' : `${number(reliability.root_cause_coverage_percent)}%`} />
            <EvidenceRow label="Causas recurrentes auditadas" value={number(reliability?.recurring_cause_count || 0)} />
            <EvidenceRow label="Identidad técnica" value={`${data.identityReadiness.technical_fields_known}/${data.identityReadiness.technical_fields_total} campos clave`} />
            <EvidenceRow label="Centro de costo" value={data.identityReadiness.has_cost_center ? 'Identificado' : 'Sin identificar'} />
          </div>
        </section>
      </div>

      {historical.composition.length > 0 ? <section>
        <div className="mb-3"><h3 className="font-medium">Composición del costo histórico</h3><p className="text-xs text-muted-foreground">Clasificación por tipo de evento del ledger, sin atribución automática a falla.</p></div>
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {historical.composition.slice(0, 4).map((row) => <div key={row.event_type} className="bg-card p-4"><p className="text-xs text-muted-foreground">{row.event_type}</p><p className="mt-2 font-semibold tabular-nums">{money(row.recognized_clp)}</p><p className="mt-1 text-xs text-muted-foreground">{number(row.event_count)} eventos</p></div>)}
        </div>
      </section> : null}

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3"><h3 className="font-medium">Qué requiere atención</h3><p className="mt-1 text-xs text-muted-foreground">Hechos observados y próxima acción; diagnóstico y prioridad siguen siendo humanos.</p></div>
        {data.signals.length === 0 ? <StatePanel tone="neutral" title="Sin señales que requieran revisión adicional" description="El historial permanece disponible como contexto económico." className="min-h-0 border-0 bg-transparent py-6"/> : <div className="divide-y">{data.signals.map((signal) => <div key={signal.key} className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(0,1fr)_44px] lg:items-start">
          <div className="pt-0.5">{signal.severity === 'high' ? <AlertTriangle className="h-5 w-5"/> : signal.severity === 'medium' ? <Wrench className="h-5 w-5"/> : <ShieldCheck className="h-5 w-5"/>}</div>
          <div><div className="flex flex-wrap items-center gap-2"><Badge variant={signal.severity === 'high' ? 'destructive' : signal.severity === 'medium' ? 'secondary' : 'outline'}>{signal.severity === 'high' ? 'Alta' : signal.severity === 'medium' ? 'Media' : 'Evidencia'}</Badge><p className="font-medium">{signal.fact}</p></div><p className="mt-2 text-sm text-muted-foreground">{signal.next_action}</p></div>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir acción"><Link href={signal.href}><ArrowRight className="h-4 w-4"/></Link></Button>
        </div>)}</div>}
      </section>

      <div className="grid gap-3 border-t pt-4 text-xs text-muted-foreground md:grid-cols-3">
        <TrustRule icon={CircleDollarSign} title="Histórico" text={data.semantics.historical_cost} />
        <TrustRule icon={Wrench} title="Ejecución moderna" text={data.semantics.audited_cost} />
        <TrustRule icon={ShieldCheck} title="Riesgo y decisión" text={data.semantics.operational_risk} />
      </div>
      {historical.truncated ? <p className="text-xs text-destructive">La vista alcanzó el límite técnico de eventos del equipo; revisar el ledger para una extracción completa.</p> : null}
    </CardContent>
  </Card>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{String(value)}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums text-right">{value}</span></div>;
}

function TrustRule({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div><div className="flex items-center gap-2 font-medium text-foreground"><Icon className="h-4 w-4"/>{title}</div><p className="mt-1 leading-5">{text}</p></div>;
}
