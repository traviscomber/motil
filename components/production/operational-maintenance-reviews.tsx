'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, ExternalLink, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SourceReport = {
  id: string;
  operation_date: string;
  rig_name_raw: string | null;
  hole_code_raw: string | null;
  equipment_status_raw: string | null;
  machine_observations: string | null;
  drilling_observations: string | null;
};

type WorkOrder = {
  id: string;
  work_order_number: string;
  status: string;
  priority: string | null;
  title: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  review_reason: string;
  status: string;
  linked_work_order_id: string | null;
  decision_note: string | null;
  created_at: string;
  sourceReport: SourceReport | null;
  workOrder: WorkOrder | null;
};

type Payload = {
  rows: ReviewRow[];
  canReview: boolean;
  canCreateWorkOrder: boolean;
  summary: { total: number; pending: number; linked: number; outOfService: number };
};

const fetcher = async (url: string): Promise<Payload> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar revisiones operacionales');
  return data;
};

const reasonLabel = (value: string) => ({
  out_of_service: 'Fuera de servicio',
  operational_with_observations: 'Operativo con observaciones',
  machine_observation: 'Observación de máquina',
}[value] || value);

const statusLabel = (value: string) => ({
  pending: 'Pendiente',
  accepted: 'Aceptada',
  work_order_created: 'OT creada',
  open: 'Abierta',
  in_progress: 'En ejecución',
  paused: 'Pausada',
  completed: 'Completada',
  closed: 'Cerrada',
}[value] || value);

const dateLabel = (value?: string | null) => value
  ? new Intl.DateTimeFormat('es-CL').format(new Date(`${value.slice(0, 10)}T12:00:00`))
  : '—';

export function OperationalMaintenanceReviews() {
  const searchParams = useSearchParams();
  const focusReviewId = searchParams.get('reviewId')?.trim() || null;
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/sondaje/mantenimiento', fetcher);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const acceptForMaintenance = async (row: ReviewRow) => {
    setBusyId(row.id);
    setActionError(null);
    try {
      const response = await fetch('/api/produccion/sondaje/mantenimiento', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewId: row.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible aceptar la revisión');
      await mutate();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible aceptar la revisión');
    } finally {
      setBusyId(null);
    }
  };

  const createWorkOrder = async (row: ReviewRow) => {
    setBusyId(row.id);
    setActionError(null);
    try {
      const response = await fetch('/api/produccion/sondaje/mantenimiento', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewId: row.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible crear la OT');
      await mutate();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible crear la OT');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return null;
  if (error) return <Card><CardContent className="pt-5 text-sm text-destructive">{error.message}</CardContent></Card>;
  if (!data?.rows.length) return null;

  const visibleRows = focusReviewId
    ? [...data.rows].sort((a, b) => Number(b.id === focusReviewId) - Number(a.id === focusReviewId))
    : data.rows;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Producción → Mantención</CardTitle>
            <CardDescription>Condiciones detectadas en Sondaje que requieren revisión o una orden de trabajo. La OT mantiene el activo y la evidencia de origen.</CardDescription>
          </div>
          <div className="flex gap-2">
            {data.summary.outOfService > 0 ? <Badge variant="destructive">{data.summary.outOfService} fuera servicio</Badge> : null}
            <Badge variant="outline">{data.summary.pending} por resolver</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        {visibleRows.slice(0, 8).map((row) => {
          const report = row.sourceReport;
          const linked = row.workOrder;
          const isCritical = row.review_reason === 'out_of_service';
          return (
            <div key={row.id} className={`flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0 lg:flex-row lg:items-center lg:justify-between ${row.id === focusReviewId ? 'rounded-md border border-primary/30 bg-primary/5 p-3' : ''}`}>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isCritical ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{report?.rig_name_raw || 'Equipo de sondaje'}</span>
                  <Badge variant={isCritical ? 'destructive' : 'outline'}>{reasonLabel(row.review_reason)}</Badge>
                  {linked ? <Badge variant="secondary">{statusLabel(linked.status)}</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(report?.operation_date)} · pozo {report?.hole_code_raw || '—'} · {report?.equipment_status_raw || 'Sin estado fuente'}
                </p>
                {report?.machine_observations ? <p className="max-w-3xl text-xs text-muted-foreground">{report.machine_observations}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {linked ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/mantenimiento/ordenes-trabajo/${linked.id}`}>
                      {linked.work_order_number}<ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : data.canCreateWorkOrder ? (
                  <Button size="sm" onClick={() => createWorkOrder(row)} disabled={busyId === row.id}>
                    {busyId === row.id ? 'Creando…' : isCritical ? 'Crear OT' : row.status === 'accepted' ? 'Crear OT' : 'Aceptar y crear OT'}
                  </Button>
                ) : !isCritical && row.status === 'pending' && data.canReview ? (
                  <Button size="sm" variant="outline" onClick={() => acceptForMaintenance(row)} disabled={busyId === row.id}>
                    {busyId === row.id ? 'Aceptando…' : 'Aceptar para Mantención'}
                  </Button>
                ) : row.status === 'accepted' ? (
                  <Badge variant="secondary">Aceptada · espera Mantención</Badge>
                ) : (
                  <Badge variant="outline">Requiere Mantención</Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
