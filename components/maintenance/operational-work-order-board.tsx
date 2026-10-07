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

function stateCopy(state: BoardRow['state']) {
  if (state === 'paused') return { label: 'Pausada', action: 'Revisar pausa' };
  if (state === 'running') return { label: 'En curso', action: 'Ver en curso' };
  if (state === 'pending_approval') return { label: 'Por aprobar', action: 'Revisar y aprobar' };
  if (state === 'resume') return { label: 'Por reanudar', action: 'Abrir' };
  return { label: 'Pendiente', action: 'Abrir' };
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
    return <StatePanel tone="loading" title="Cargando órdenes de trabajo" className="min-h-40" />;
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        title="No se pudo cargar la mesa de OT"
        description={error.message}
        actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
        className="min-h-0 py-5"
      />
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="operational-ot-title">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mantenimiento · operación</p>
          <h2 id="operational-ot-title" className="mt-1 text-xl font-semibold">Órdenes de trabajo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lo que está ocurriendo ahora, quién lo tiene y qué requiere atención.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">En curso {summary?.running ?? 0}</Badge>
          <Badge variant="outline">Pausadas {summary?.paused ?? 0}</Badge>
          <Badge variant="outline">Pendientes {summary?.pending ?? 0}</Badge>
          <Badge variant="outline">Por aprobar {summary?.pendingApproval ?? 0}</Badge>
          <Button type="button" variant="ghost" size="icon" aria-label="Actualizar órdenes" onClick={() => void mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <StatePanel tone="neutral" title="No hay OT que requieran atención" description="Las OT activas o pendientes de aprobación aparecerán aquí." className="min-h-32" />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {visibleRows.map((row) => {
            const copy = stateCopy(row.state);
            const elapsed = row.state === 'running' && row.timerStartTime
              ? row.totalTimerSeconds + Math.max(0, Math.floor((nowMs - new Date(row.timerStartTime).getTime()) / 1000))
              : row.totalTimerSeconds;
            const pauseText = row.state === 'paused'
              ? row.lastPauseComment || 'Pausa sin comentario registrado'
              : null;

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
                      {copy.label}
                    </Badge>
                    {row.priority === 'critical' || row.priority === 'high' ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.priority === 'critical' ? 'Crítica' : 'Alta'}</span> : null}
                  </div>
                  <p className="mt-1 truncate font-medium">{row.title || 'Orden de trabajo'}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {row.asset?.code || 'Sin código'} · {row.asset?.name || 'Equipo no informado'}
                  </p>
                  {pauseText ? <p className="mt-2 text-sm font-medium">{pauseText}</p> : null}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Responsable</p>
                  <p className="mt-1 text-sm font-medium">{row.assignedToName || 'Sin asignar'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Tiempo</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    {elapsed > 0 ? duration(elapsed) : 'Sin iniciar'}
                  </p>
                  {row.scheduledDate ? <p className="mt-1 text-xs text-muted-foreground">Programada {row.scheduledDate}</p> : null}
                </div>

                <span className="inline-flex items-center justify-end gap-2 text-sm font-medium">
                  {copy.action}
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
