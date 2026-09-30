'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type DeadlineItem = {
  id: string;
  title: string;
  reason: string;
  category: string;
  category_label: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  critical: boolean;
  due_date: string | null;
  days_until: number | null;
  overdue: boolean;
  owner: string | null;
  status: string;
  action_required: string | null;
  evidence_status: string;
  source_href: string;
};

type Payload = {
  data: DeadlineItem[];
  summary: {
    total: number;
    overdue: number;
    critical: number;
    due_next_7_days: number;
    without_evidence: number;
  };
  policy: {
    source: string;
    rule: string;
    calendar: string;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los plazos fatales');
  return payload;
};

function dueLabel(item: DeadlineItem) {
  if (!item.due_date) return 'Sin plazo';
  if (item.days_until === null) return item.due_date;
  if (item.days_until < 0) return `Vencido hace ${Math.abs(item.days_until)} días`;
  if (item.days_until === 0) return 'Vence hoy';
  return `Vence en ${item.days_until} días`;
}

export default function FatalDeadlinesPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/fatal-deadlines', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando plazos fatales" description="Revisando sólo fechas acreditadas en casos legales." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="Plazos fatales no disponibles" description="No se crean fechas ni obligaciones por inferencia." actions={<Button variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button>} />;
  }

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Control crítico</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Plazos fatales</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Vencimientos con fecha acreditada, priorizados por criticidad, atraso, evidencia y responsable.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-5">
        {[
          ['Abiertos', data.summary.total],
          ['Vencidos', data.summary.overdue],
          ['Críticos', data.summary.critical],
          ['Próx. 7 días', data.summary.due_next_7_days],
          ['Sin evidencia', data.summary.without_evidence],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="divide-y overflow-hidden rounded-md border">
        {data.data.length ? data.data.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.critical ? 'destructive' : 'outline'}>{item.category_label}</Badge>
                  <Badge variant="outline">{item.status.replaceAll('_', ' ')}</Badge>
                  <Badge variant="outline">Evidencia: {['complete', 'not_required'].includes(item.evidence_status) ? 'resuelta' : 'pendiente'}</Badge>
                </div>
                <h2 className="mt-2 text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                {item.action_required ? <p className="mt-2 text-sm">{item.action_required}</p> : null}
              </div>

              <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                <p className={item.overdue ? 'font-medium text-destructive' : item.critical ? 'font-medium' : ''}>{dueLabel(item)}</p>
                <p className="mt-1">{item.owner || 'Responsable no asignado'}</p>
              </div>
            </div>

            <div className="mt-3 border-t pt-3">
              <Button asChild variant="ghost" size="sm">
                <Link href={item.source_href}>
                  Abrir caso <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>
        )) : (
          <p className="p-4 text-sm text-muted-foreground">
            No hay casos legales abiertos con fecha registrada. MOTIL no crea plazos fatales por inferencia.
          </p>
        )}
      </section>

      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-semibold">Regla de control</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.policy.rule}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.policy.calendar}</p>
      </section>
    </div>
  );
}
