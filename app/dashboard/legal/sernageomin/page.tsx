'use client';

import useSWR from 'swr';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar SERNAGEOMIN');
  return payload;
};

type Obligation = {
  id: string;
  title: string;
  legalBasis: string[];
  cadence: string;
  trigger: string;
  applicabilityNote: string;
  timingRule: string;
  responsibleFunctions: string[];
  expectedEvidence: string[];
  sourceUrl: string;
  evidenceCount: number;
  evidenceRefs: Array<{ canonicalRef: string; label: string; scope: string; freshnessAt: string | null }>;
  reviewState: string;
};

type Payload = {
  available: boolean;
  obligations: Obligation[];
  summary?: {
    obligations: number;
    withObservedEvidence: number;
    requiringApplicabilityReview: number;
    complianceVerdictCalculated: boolean;
  };
};

const cadenceLabel: Record<string, string> = {
  before_operation: 'Antes de operar',
  event_driven: 'Por evento',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  continuous: 'Continuo',
  lifecycle: 'Ciclo de vida',
};

export default function SernageominLegalPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/sernageomin', fetcher, { revalidateOnFocus: false });

  if (isLoading) {
    return <StatePanel tone="neutral" title="Cargando control SERNAGEOMIN" description="Cruzando obligaciones de referencia con evidencia canónica visible para tu rol." />;
  }

  if (error || !data?.available) {
    return <StatePanel tone="error" title="Control SERNAGEOMIN no disponible" description="No se infiere cumplimiento cuando la fuente regulatoria o la evidencia canónica no están disponibles." actions={<Button variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button>} />;
  }

  const summary = data.summary;

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · SERNAGEOMIN</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Control regulatorio</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Qué puede exigir SERNAGEOMIN, qué evidencia existe en MOTIL y qué requiere validación humana. Esta vista no declara cumplimiento legal.
        </p>
      </header>

      <section aria-label="Resumen regulatorio" className="grid overflow-hidden rounded-md border sm:grid-cols-3">
        <div className="px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Obligaciones de referencia</p>
          <p className="mt-1 text-xl font-semibold">{summary?.obligations ?? '—'}</p>
        </div>
        <div className="border-t px-4 py-3 sm:border-l sm:border-t-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Con evidencia observada</p>
          <p className="mt-1 text-xl font-semibold">{summary?.withObservedEvidence ?? '—'}</p>
        </div>
        <div className="border-t px-4 py-3 sm:border-l sm:border-t-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Aplicabilidad por validar</p>
          <p className="mt-1 text-xl font-semibold">{summary?.requiringApplicabilityReview ?? '—'}</p>
        </div>
      </section>

      <div className="divide-y overflow-hidden rounded-md border">
        {data.obligations.map((item) => (
          <article key={item.id} className="p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{cadenceLabel[item.cadence] || item.cadence}</Badge>
                  <span className="text-xs text-muted-foreground">{item.legalBasis.join(' · ')}</span>
                </div>
                <h2 className="mt-2 text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.trigger}</p>
              </div>
              <div className="shrink-0 text-left md:text-right">
                <p className="text-xs text-muted-foreground">Evidencia observada</p>
                <p className="text-lg font-semibold tabular-nums">{item.evidenceCount}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cuándo</p>
                <p className="mt-1 text-sm leading-relaxed">{item.timingRule}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Responsables sugeridos</p>
                <p className="mt-1 text-sm leading-relaxed">{item.responsibleFunctions.join(' · ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Aplicabilidad</p>
                <p className="mt-1 text-sm leading-relaxed">{item.applicabilityNote}</p>
              </div>
            </div>

            <details className="mt-4 border-t pt-3">
              <summary className="cursor-pointer text-sm font-medium">Ver evidencia esperada y observada</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Esperada</p>
                  <p className="mt-1 text-sm leading-relaxed">{item.expectedEvidence.map((value) => value.replaceAll('_', ' ')).join(' · ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Observada en MOTIL</p>
                  {item.evidenceRefs.length ? (
                    <div className="mt-1 space-y-1">
                      {item.evidenceRefs.map((ref) => <p key={ref.canonicalRef} className="text-sm">{ref.label} <span className="text-xs text-muted-foreground">· {ref.scope}</span></p>)}
                    </div>
                  ) : <p className="mt-1 text-sm text-muted-foreground">No observada en las fuentes canónicas disponibles. Esto no prueba ausencia ni incumplimiento.</p>}
                </div>
              </div>
            </details>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Estado: requiere validación humana</p>
              <Button asChild variant="ghost" size="sm">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">Fuente oficial <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
