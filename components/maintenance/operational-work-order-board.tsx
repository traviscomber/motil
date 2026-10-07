'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CirclePause, CirclePlay, Clock3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { formatWorkOrderNumber } from '@/lib/maintenance/work-order-display';
import type { Locale } from '@/lib/i18n/dictionaries';

type BoardRow = {
  id: string;
  workOrderNumber: string | null;
  title: string | null;
  state: 'paused' | 'running' | 'pending_approval' | 'resume' | 'pending';
  priority: string | null;
  scheduledDate: string | null;
  assignedToName: string | null;
  timerStatus: string | null;
  timerStartTime: string | null;
  totalTimerSeconds: number;
  lastPauseComment: string | null;
  lastPauseAt: string | null;
  lastComment: string | null;
  lastCommentAt: string | null;
  asset?: { id: string; code: string | null; name: string | null } | null;
  href: string;
};

type BoardResponse = {
  board?: BoardRow[];
  summary?: {
    running: number;
    paused: number;
    pending: number;
    pendingApproval: number;
  };
};

async function fetcher(url: string): Promise<BoardResponse> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la mesa de OT.');
  return payload as BoardResponse;
}

function duration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

function stateCopy(state: BoardRow['state'], locale: Locale) {
  const en = locale === 'en';
  if (state === 'paused') return { label: en ? 'Paused' : 'Pausada', action: en ? 'Review pause' : 'Revisar pausa' };
  if (state === 'running') return { label: en ? 'In progress' : 'En curso', action: en ? 'View work' : 'Ver en curso' };
  if (state === 'pending_approval') return { label: en ? 'Awaiting approval' : 'Por aprobar', action: en ? 'Review and approve' : 'Revisar y aprobar' };
  if (state === 'resume') return { label: en ? 'Resume' : 'Por reanudar', action: en ? 'Open' : 'Abrir' };
  return { label: en ? 'Pending' : 'Pendiente', action: en ? 'Open' : 'Abrir' };
}

export function OperationalWorkOrderBoard({ locale }: { locale: Locale }) {
  const { data, error, isLoading, mutate } = useSWR<BoardResponse>(
    '/api/maintenance/operational-board',
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 60_000 },
  );
  const rows = data?.board || [];
  const summary = data?.summary;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!rows.some((row) => row.state === 'running' && row.timerStartTime)) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [rows]);

  const visibleRows = useMemo(() => rows.slice(0, 30), [rows]);

  if (isLoading) {
    return <StatePanel tone="loading" title={locale === 'en' ? 'Loading work orders' : 'Cargando órdenes de trabajo'} className="min-h-40" />;
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        title={locale === 'en' ? 'Could not load the WO board' : 'No se pudo cargar la mesa de OT'}
        description={error.message}
        actions={<Button variant="outline" onClick={() => void mutate()}>{locale === 'en' ? 'Retry' : 'Reintentar'}</Button>}
        className="min-h-0 py-5"
      />
    );
  }

  const copy = locale === 'en'
    ? {
        eyebrow: 'Maintenance · operations',
        title: 'Work orders',
        description: 'What is happening now, who owns it, and what needs attention.',
        running: 'In progress',
        paused: 'Paused',
        pending: 'Pending',
        approval: 'Awaiting approval',
        emptyTitle: 'No WOs need attention',
        emptyDescription: 'Active work orders or approvals will appear here.',
        retry: 'Retry',
        loadError: 'Could not load the WO board',
        loading: 'Loading work orders',
        assignee: 'Owner',
        time: 'Time',
        notStarted: 'Not started',
        scheduled: 'Scheduled',
        noCode: 'No code',
        noAsset: 'Equipment not provided',
        noAssignee: 'Unassigned',
        pausePrefix: 'Pause',
        noPauseComment: 'Pause without a recorded comment',
        commentPrefix: 'Comment',
      }
    : {
        eyebrow: 'Mantenimiento · operación',
        title: 'Órdenes de trabajo',
        description: 'Lo que está ocurriendo ahora, quién lo tiene y qué requiere atención.',
        running: 'En curso',
        paused: 'Pausadas',
        pending: 'Pendientes',
        approval: 'Por aprobar',
        emptyTitle: 'No hay OT que requieran atención',
        emptyDescription: 'Las OT activas o pendientes de aprobación aparecerán aquí.',
        retry: 'Reintentar',
        loadError: 'No se pudo cargar la mesa de OT',
        loading: 'Cargando órdenes de trabajo',
        assignee: 'Responsable',
        time: 'Tiempo',
        notStarted: 'Sin iniciar',
        scheduled: 'Programada',
        noCode: 'Sin código',
        noAsset: 'Equipo no informado',
        noAssignee: 'Sin asignar',
        pausePrefix: 'Pausa',
        noPauseComment: 'Pausa sin comentario registrado',
        commentPrefix: 'Comentario',
      };

  return (
    <section className="space-y-3" aria-labelledby="operational-ot-title">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.eyebrow}</p>
          <h2 id="operational-ot-title" className="mt-1 text-xl font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{copy.running} {summary?.running ?? 0}</Badge>
          <Badge variant="outline">{copy.paused} {summary?.paused ?? 0}</Badge>
          <Badge variant="outline">{copy.pending} {summary?.pending ?? 0}</Badge>
          <Badge variant="outline">{copy.approval} {summary?.pendingApproval ?? 0}</Badge>
          <Button type="button" variant="ghost" size="icon" aria-label="Actualizar órdenes" onClick={() => void mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <StatePanel tone="neutral" title={copy.emptyTitle} description={copy.emptyDescription} className="min-h-32" />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {visibleRows.map((row) => {
            const state = stateCopy(row.state, locale);
            const elapsed = row.state === 'running' && row.timerStartTime
              ? row.totalTimerSeconds + Math.max(0, Math.floor((nowMs - new Date(row.timerStartTime).getTime()) / 1000))
              : row.totalTimerSeconds;
            const pauseText = row.state === 'paused'
              ? row.lastPauseComment || copy.noPauseComment
              : null;
            const commentText = row.state !== 'paused' ? row.lastComment : null;

            return (
              <Link
                key={row.id}
                href={row.href}
                className="grid gap-3 border-b p-4 outline-none transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,.7fr)_minmax(140px,.6fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatWorkOrderNumber(row.workOrderNumber, locale)}</span>
                    <Badge variant={row.state === 'paused' ? 'secondary' : row.state === 'running' ? 'default' : 'outline'}>
                      {row.state === 'paused' ? <CirclePause className="mr-1 h-3 w-3" /> : row.state === 'running' ? <CirclePlay className="mr-1 h-3 w-3" /> : null}
                      {state.label}
                    </Badge>
                    {row.priority === 'critical' || row.priority === 'high' ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.priority === 'critical' ? 'Crítica' : 'Alta'}</span> : null}
                  </div>
                  <p className="mt-1 truncate font-medium">{row.title || 'Orden de trabajo'}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {row.asset?.name || copy.noAsset}
                  </p>
                  {pauseText ? <p className="mt-2 text-sm font-medium">{copy.pausePrefix}: {pauseText}</p> : null}
                  {commentText ? <p className="mt-2 text-sm text-muted-foreground">{copy.commentPrefix}: {commentText}</p> : null}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{copy.assignee}</p>
                  <p className="mt-1 text-sm font-medium">{row.assignedToName || copy.noAssignee}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{copy.time}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    {elapsed > 0 ? duration(elapsed) : copy.notStarted}
                  </p>
                  {row.scheduledDate ? <p className="mt-1 text-xs text-muted-foreground">{copy.scheduled} {row.scheduledDate}</p> : null}
                </div>

                <span className="inline-flex items-center justify-end gap-2 text-sm font-medium">
                  {state.action}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {rows.length > visibleRows.length ? (
        <p className="text-xs text-muted-foreground">Mostrando las primeras {visibleRows.length} de {rows.length} OT que requieren atención.</p>
      ) : null}
    </section>
  );
}
