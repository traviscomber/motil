'use client';

import useSWR from 'swr';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la bandeja regulatoria');
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
  workstream: string;
  priority: 'critical' | 'high' | 'medium';
  businessOwner: string;
  legalRole: string;
  contributors: string[];
  nextAction: string;
  riskIfUnmanaged: string;
  expectedEvidence: string[];
  sourceUrl: string;
  evidenceCount: number;
  evidenceRefs: Array<{ canonicalRef: string; label: string; scope: string; freshnessAt: string | null }>;
  actionState: 'review_evidence' | 'validate_and_collect';
};

type Payload = {
  available: boolean;
  authority: string;
  obligations: Obligation[];
  summary?: {
    obligations: number;
    critical: number;
    withMatchedEvidence: number;
    withoutMatchedEvidence: number;
    requiringApplicabilityReview: number;
  };
  operatingModel?: {
    legal: string;
    businessOwner: string;
    closeRule: string;
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

const priorityLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media' } as const;

export default function MiningLegalObligationsPage() {
  const { data, error, isLoading, mutate } = useSWR<Payload>('/api/legal/sernageomin', fetcher, { revalidateOnFocus: false });

  if (isLoading) {
    return <StatePanel tone="neutral" title="Cargando obligaciones" description="Cruzando contexto regulatorio con la evidencia canónica disponible en MOTIL." />;
  }

  if (error || !data?.available) {
    return <StatePanel tone="error" title="Bandeja regulatoria no disponible" description="No se infiere cumplimiento ni ausencia de obligaciones cuando las fuentes no están disponibles." actions={<Button variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button>} />;
  }

  const summary = data.summary;

  return (
    <div className="space-y-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal · Control regulatorio</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Obligaciones y acciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Revisa qué requiere acción, quién responde y qué evidencia falta validar.
        </p>
      </header>

      <details className="rounded-md border" aria-label="Metodología e indicadores regulatorios">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver metodología e indicadores</summary>
        <div className="space-y-4 border-t p-4">
        <section className="rounded-md border bg-muted/20 p-4">
          <p className="text-sm font-semibold">Cómo trabajar esta bandeja</p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <p><span className="font-medium">1. Legal</span><br /><span className="text-muted-foreground">{data.operatingModel?.legal}</span></p>
            <p><span className="font-medium">2. Área responsable</span><br /><span className="text-muted-foreground">{data.operatingModel?.businessOwner}</span></p>
            <p><span className="font-medium">3. Cierre</span><br /><span className="text-muted-foreground">{data.operatingModel?.closeRule}</span></p>
          </div>
        </section>
  
        <section aria-label="Resumen regulatorio" className="grid overflow-hidden rounded-md border sm:grid-cols-4">
          <div className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Obligaciones</p>
            <p className="mt-1 text-xl font-semibold">{summary?.obligations ?? '—'}</p>
          </div>
          <div className="border-t px-4 py-3 sm:border-l sm:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Críticas</p>
            <p className="mt-1 text-xl font-semibold">{summary?.critical ?? '—'}</p>
          </div>
          <div className="border-t px-4 py-3 sm:border-l sm:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Con evidencia candidata</p>
            <p className="mt-1 text-xl font-semibold">{summary?.withMatchedEvidence ?? '—'}</p>
          </div>
          <div className="border-t px-4 py-3 sm:border-l sm:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Sin evidencia vinculada</p>
            <p className="mt-1 text-xl font-semibold">{summary?.withoutMatchedEvidence ?? '—'}</p>
          </div>
        </section>
  
  
        </div>
      </details>

      <div className="space-y-3">
        {data.obligations.map((item) => (
          <article key={item.id} className="rounded-md border p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.priority === 'critical' ? 'destructive' : 'outline'}>{priorityLabel[item.priority]}</Badge>
                  <Badge variant="outline">{cadenceLabel[item.cadence] || item.cadence}</Badge>
                  <span className="text-xs text-muted-foreground">{data.authority} · {item.legalBasis.join(' · ')}</span>
                </div>
                <h2 className="mt-2 text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Se activa cuando:</span> {item.trigger}</p>
              </div>
              <div className="shrink-0">
                <Badge variant={item.actionState === 'review_evidence' ? 'secondary' : 'outline'}>
                  {item.actionState === 'review_evidence' ? 'Revisar evidencia' : 'Validar y reunir evidencia'}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Próxima acción</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">{item.nextAction}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Plazo / frecuencia</p>
                <p className="mt-1 text-sm leading-relaxed">{item.timingRule}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Dueño operativo</p>
                <p className="mt-1 text-sm font-medium">{item.businessOwner}</p>
                <p className="mt-1 text-xs text-muted-foreground">Apoyo: {item.contributors.join(' · ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Qué hace Legal</p>
                <p className="mt-1 text-sm leading-relaxed">{item.legalRole}</p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-dashed px-3 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Riesgo si no se gestiona</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.riskIfUnmanaged}</p>
                </div>
              </div>
            </div>

            <details className="mt-4 border-t pt-3">
              <summary className="cursor-pointer text-sm font-medium">Evidencia y aplicabilidad</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Aplicabilidad</p>
                  <p className="mt-1 text-sm leading-relaxed">{item.applicabilityNote}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Evidencia esperada</p>
                  <p className="mt-1 text-sm leading-relaxed">{item.expectedEvidence.map((value) => value.replaceAll('_', ' ')).join(' · ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Evidencia candidata en MOTIL</p>
                  {item.evidenceRefs.length ? (
                    <div className="mt-1 space-y-1">
                      {item.evidenceRefs.map((ref) => <p key={ref.canonicalRef} className="text-sm">{ref.label} <span className="text-xs text-muted-foreground">· {ref.scope}</span></p>)}
                    </div>
                  ) : <p className="mt-1 text-sm text-muted-foreground">No hay coincidencia contextual visible. Esto no prueba incumplimiento ni que la obligación aplique.</p>}
                </div>
              </div>
            </details>

            <div className="mt-4 flex justify-end">
              <Button asChild variant="ghost" size="sm">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
