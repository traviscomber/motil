'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type DecisionCase = {
  id: string;
  target_domain: string;
  title: string;
  summary: string;
  missing_evidence?: string[];
  recommended_human_action?: string | null;
  last_revalidated_at?: string | null;
};

type Payload = { cases?: DecisionCase[] };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (response.status === 401 || response.status === 403) return { cases: [] } as Payload;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar prioridades persistentes.');
  return payload as Payload;
};

const labels: Record<string, string> = { maintenance: 'Mantención', geology: 'Geología' };
const hrefs: Record<string, string> = { maintenance: '/dashboard/mantenimiento', geology: '/dashboard/produccion/geologia' };

function short(value: string, max = 160) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

export function HomeDecisionPriorities() {
  const state = useSWR<Payload>('/api/intelligence/decision-cases?status=open', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
  });
  const cases = (state.data?.cases || []).filter((item) => item.target_domain === 'maintenance' || item.target_domain === 'geology').slice(0, 3);

  if (state.error || state.isLoading || cases.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Prioridades persistentes del Intelligence Core">
      <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Qué requiere atención</h2>
            <Badge variant="outline">Advisory</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Casos persistentes revalidados contra evidencia operacional. No ejecutan cambios por sí solos.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link href="/dashboard/decisiones">Ver casos <ArrowRight className="ml-2 size-4" /></Link></Button>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {cases.map((item) => {
          const missing = Array.isArray(item.missing_evidence) ? item.missing_evidence : [];
          return (
            <Card key={item.id} className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Route className="size-3.5" />{labels[item.target_domain] || item.target_domain}</span>
                  <span>{item.last_revalidated_at ? 'Revalidado' : 'Pendiente de revalidación'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium leading-5">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{short(item.summary)}</p>
                </div>
                {missing.length ? <p className="text-[11px] leading-5 text-muted-foreground"><span className="font-medium text-foreground">Falta:</span> {short(missing.slice(0, 2).join(' · '), 130)}</p> : null}
                {item.recommended_human_action ? <p className="text-xs leading-5"><span className="font-medium">Siguiente acción:</span> {short(item.recommended_human_action, 140)}</p> : null}
                <Button asChild variant="outline" size="sm" className="w-full"><Link href={hrefs[item.target_domain] || '/dashboard/decisiones'}>Abrir contexto</Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
