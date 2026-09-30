'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los casos legales');
  return payload;
};

type LegalCase = {
  id: string;
  source: string;
  matter: string;
  priority: 'critical' | 'high' | 'medium';
  title: string;
  reason: string;
  nextAction: string;
  owner: string;
  legalRole: string;
  dueLabel: string;
  evidenceState: string;
  href: string;
};

type Payload = {
  cases: LegalCase[];
  summary: {
    total: number;
    critical: number;
    high: number;
    contracts: number;
    regulatory: number;
    documents: number;
  };
  policy: {
    derivedQueue: boolean;
    sourceOfTruth: string;
    closeRule: string;
  };
};

const priorityLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media' } as const;

export default function LegalCasesPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/cases', fetcher, { revalidateOnFocus: false });

  if (isLoading) {
    return <StatePanel tone="neutral" title="Cargando casos legales" description="Consolidando señales reales desde contratos, documentos y control regulatorio." />;
  }

  if (error || !data) {
    return <StatePanel tone="error" title="No fue posible cargar los casos legales" description="La bandeja no reemplaza datos faltantes por estados ficticios." actions={<Button variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button>} />;
  }

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Casos</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Trabajo que requiere una decisión, coordinación o revisión Legal. Cada caso conserva su fuente operacional original.
        </p>
      </header>

      <section className="grid overflow-hidden rounded-md border sm:grid-cols-4">
        {[
          ['Casos activos', data.summary.total],
          ['Críticos', data.summary.critical],
          ['Alta prioridad', data.summary.high],
          ['Regulatorios', data.summary.regulatory],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-3 ${index ? 'border-t sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {data.cases.length === 0 ? (
        <StatePanel
          tone="neutral"
          title="No hay casos activos derivados de las fuentes actuales"
          description="Esto no significa que no existan obligaciones legales; significa que MOTIL no detecta hoy una señal operacional suficiente para abrir trabajo en esta bandeja."
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-md border">
          {data.cases.map((item) => (
            <article key={item.id} className="p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.priority === 'critical' ? 'destructive' : 'outline'}>{priorityLabel[item.priority]}</Badge>
                    <span className="text-xs text-muted-foreground">{item.matter}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={item.href}>Abrir fuente <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </div>

              <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Próxima acción</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed">{item.nextAction}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Dueño operativo</p>
                  <p className="mt-1 text-sm">{item.owner}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Qué hace Legal</p>
                  <p className="mt-1 text-sm leading-relaxed">{item.legalRole}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Plazo / evidencia</p>
                  <p className="mt-1 text-sm">{item.dueLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.evidenceState}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-md border border-dashed p-4">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Regla de cierre</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.policy.closeRule}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
