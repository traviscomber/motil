'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Clock3, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type AttentionFactor = { code: string; label: string; weight: number };

type DecisionCase = {
  id: string;
  target_domain: string;
  title: string;
  summary: string;
  missing_evidence?: string[];
  recommended_human_action?: string | null;
  last_revalidated_at?: string | null;
  attention?: { score: number; level: 'P1' | 'P2' | 'P3'; factors: AttentionFactor[] };
};

type TemporalChange = {
  caseId: string;
  kind: 'appeared' | 'acknowledged' | 'revalidated' | 'resolved' | 'changed';
  at: string;
  targetDomain: string;
  title: string;
  status: string;
};

type PriorityPayload = { cases?: DecisionCase[] };
type ChangePayload = { changes?: TemporalChange[]; since?: string; through?: string };

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (response.status === 401 || response.status === 403) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Intelligence Core.');
  return payload as T;
}

const labels: Record<string, string> = {
  maintenance: 'Mantención', geology: 'Geología', inventory: 'Inventario', procurement: 'Compras',
  production: 'Producción', finance: 'Finanzas', hse: 'HSE',
};

const hrefs: Record<string, string> = {
  maintenance: '/dashboard/mantenimiento', geology: '/dashboard/produccion/geologia', inventory: '/dashboard/bodega',
  procurement: '/dashboard/compras', production: '/dashboard/produccion', finance: '/dashboard/finanzas', hse: '/dashboard/sostenibilidad',
};

const changeLabels: Record<TemporalChange['kind'], string> = {
  appeared: 'Apareció', acknowledged: 'Revisado', revalidated: 'Revalidado', resolved: 'Resuelto', changed: 'Cambió',
};

function short(value: string, max = 160) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function primaryReason(item: DecisionCase) {
  return (item.attention?.factors || [])
    .filter((factor) => factor.weight > 0 && factor.code !== 'open_case' && factor.code !== 'missing_evidence')
    .sort((a, b) => b.weight - a.weight)[0]?.label || null;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function HomeDecisionPriorities() {
  const priorities = useSWR<PriorityPayload | null>('/api/intelligence/decision-cases/prioritized?limit=3', fetchJson, {
    revalidateOnFocus: false, refreshInterval: 60000,
  });
  const temporal = useSWR<ChangePayload | null>('/api/intelligence/decision-cases/changes?hours=24', fetchJson, {
    revalidateOnFocus: false, refreshInterval: 60000,
  });

  const cases = priorities.data?.cases || [];
  const changes = (temporal.data?.changes || []).slice(0, 3);
  if ((priorities.error || priorities.isLoading) && (temporal.error || temporal.isLoading)) return null;
  if (cases.length === 0 && changes.length === 0) return null;

  return (
    <section className="space-y-5" aria-label="Prioridades y cambios del Intelligence Core">
      {cases.length > 0 ? <>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-5">
          <div>
            <div className="flex items-center gap-2"><h2 className="text-lg font-semibold tracking-tight">Qué requiere atención</h2><Badge variant="outline">Advisory</Badge></div>
            <p className="mt-1 text-xs text-muted-foreground">Máximo tres casos priorizados por evidencia explícita y permisos reales. No ejecutan cambios por sí solos.</p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/decisiones">Ver casos <ArrowRight className="ml-2 size-4" /></Link></Button>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          {cases.map((item) => {
            const missing = Array.isArray(item.missing_evidence) ? item.missing_evidence : [];
            const reason = primaryReason(item);
            return <Card key={item.id} className="shadow-none"><CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Route className="size-3.5" />{labels[item.target_domain] || item.target_domain}</span>
                <div className="flex items-center gap-2">{item.attention?.level ? <Badge variant="outline">{item.attention.level}</Badge> : null}<span>{item.last_revalidated_at ? 'Revalidado' : 'Pendiente de revalidación'}</span></div>
              </div>
              <div><p className="text-sm font-medium leading-5">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{short(item.summary)}</p></div>
              {reason ? <p className="text-[11px] leading-5 text-muted-foreground"><span className="font-medium text-foreground">Por qué importa:</span> {short(reason, 130)}</p> : null}
              {missing.length ? <p className="text-[11px] leading-5 text-muted-foreground"><span className="font-medium text-foreground">Falta:</span> {short(missing.slice(0, 2).join(' · '), 130)}</p> : null}
              {item.recommended_human_action ? <p className="text-xs leading-5"><span className="font-medium">Siguiente acción:</span> {short(item.recommended_human_action, 140)}</p> : null}
              <Button asChild variant="outline" size="sm" className="w-full"><Link href={hrefs[item.target_domain] || '/dashboard/decisiones'}>Abrir contexto</Link></Button>
            </CardContent></Card>;
          })}
        </div>
      </> : null}

      {changes.length > 0 ? <div className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" /><h3 className="text-sm font-medium">Cambió desde ayer</h3><Badge variant="outline">24 h</Badge></div>
        <div className="grid gap-2 md:grid-cols-3">
          {changes.map((change) => <Link key={`${change.caseId}-${change.kind}-${change.at}`} href={hrefs[change.targetDomain] || '/dashboard/decisiones'} className="rounded-md border p-3 transition-colors hover:bg-muted/40">
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{labels[change.targetDomain] || change.targetDomain}</span><span>{timeLabel(change.at)}</span></div>
            <p className="mt-1 text-xs font-medium">{changeLabels[change.kind]}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{short(change.title, 105)}</p>
          </Link>)}
        </div>
        <p className="text-[11px] text-muted-foreground">Derivado sólo del lifecycle explícito de Decision Cases; no implica impacto, causalidad ni prioridad adicional.</p>
      </div> : null}
    </section>
  );
}
