'use client';

import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  locale: 'es' | 'en';
  decisionCount: number;
  blockerCount: number;
  readyToCloseCount: number;
  firstActionHref: string;
};

export function AutopilotDecisionStrip({
  locale,
  decisionCount,
  blockerCount,
  readyToCloseCount,
  firstActionHref,
}: Props) {
  const copy = locale === 'en'
    ? {
        label: 'MOTIL Autopilot',
        title: 'Decisions for today',
        description: 'MOTIL prepares the operational context. People keep authority over approvals, priorities and closure.',
        decisions: 'human decisions',
        blockers: 'blockers',
        ready: 'ready to close',
        cta: 'Review next decision',
        clear: 'No pending decisions',
      }
    : {
        label: 'MOTIL · decisiones asistidas',
        title: 'Decisiones de hoy',
        description: 'MOTIL prepara el contexto operacional. Las personas mantienen la autoridad sobre aprobaciones, prioridades y cierre.',
        decisions: 'decisiones humanas',
        blockers: 'bloqueos',
        ready: 'listas para cierre',
        cta: 'Revisar siguiente decisión',
        clear: 'Sin decisiones pendientes',
      };

  return (
    <section aria-labelledby="autopilot-title" className="border-y border-border py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.label}</p>
            <Badge variant={decisionCount > 0 ? 'outline' : 'secondary'}>
              {decisionCount > 0 ? `${decisionCount} ${copy.decisions}` : copy.clear}
            </Badge>
          </div>
          <h2 id="autopilot-title" className="mt-2 text-lg font-semibold">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />{blockerCount} {copy.blockers}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{readyToCloseCount} {copy.ready}</span>
          </div>
        </div>
        {decisionCount > 0 ? (
          <Button asChild>
            <Link href={firstActionHref}>{copy.cta}<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
