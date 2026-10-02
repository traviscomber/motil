'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el desempeño del personal');
  return payload;
};

type MaintenanceWorker = {
  name: string;
  cargo: string;
  workerType: 'Mecánico' | 'Operario';
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  preventive: number;
  corrective: number;
  predictive: number;
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number;
  avgEfficiency: number;
  timelinessRate: number;
  criticalAssigned: number;
  criticalCompleted: number;
  criticalResolutionRate: number;
  performanceScore: number | null;
  evaluationStatus: 'scored' | 'awaiting_operational_evidence';
};

type Summary = {
  totalWorkOrders: number;
  completedWorkOrders: number;
  completionRate: number;
  avgMTTR: number;
  activeWorkers: number;
  mechanics: number;
  operators: number;
  unclassifiedAssignments: number;
  periodDays: number;
  scoringMethod?: {
    mechanic: string;
    operator: string;
  };
};

type PerformanceResponse = {
  workers: MaintenanceWorker[];
  summary: Summary;
};

function WorkerRow({ worker }: { worker: MaintenanceWorker }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_110px_110px] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{worker.name}</p>
        <p className="truncate text-xs text-muted-foreground">{worker.cargo}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">OT activas</p>
        <p className="mt-1 text-sm font-medium">{worker.inProgress + worker.pending}</p>
      </div>
      <div className="sm:text-right">
        <p className="text-xs text-muted-foreground">Completadas</p>
        <p className="mt-1 text-sm font-medium">{worker.completed}</p>
        {worker.overdue > 0 ? <p className="mt-1 text-xs text-destructive">{worker.overdue} vencida(s)</p> : null}
      </div>
    </div>
  );
}

export function MaintenancePersonnelPerformanceBoard() {
  const [days, setDays] = useState('60');
  const { data, isLoading, error } = useSWR<PerformanceResponse>(`/api/maintenance/technicians/performance?days=${days}`, fetcher, { revalidateOnFocus: false });
  const workers = data?.workers ?? [];
  const summary = data?.summary;
  const mechanics = workers.filter((worker) => worker.workerType === 'Mecánico');
  const operators = workers.filter((worker) => worker.workerType === 'Operario');

  if (isLoading) return <StatePanel tone="loading" title="Cargando desempeño" description="Reuniendo órdenes y cargos de la matriz vigente." />;
  if (error) return <StatePanel tone="error" title="No se pudo cargar el desempeño" description={error instanceof Error ? error.message : 'Reintenta la consulta.'} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Personal de mantenimiento</h2>
          <p className="mt-1 text-sm text-muted-foreground">Carga de trabajo por persona. Sin ranking ni score cuando la evidencia operacional no lo justifica.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 días</SelectItem><SelectItem value="60">Últimos 60 días</SelectItem><SelectItem value="90">Últimos 90 días</SelectItem><SelectItem value="180">Últimos 6 meses</SelectItem><SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {summary ? (
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
          {[
            ['Mecánicos', summary.mechanics],
            ['Operarios', summary.operators],
            ['OT con cargo válido', summary.totalWorkOrders],
          ].map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
      ) : null}

      {summary?.unclassifiedAssignments ? (
        <StatePanel tone="neutral" title="Asignaciones por clasificar" description={`${summary.unclassifiedAssignments} OT tienen una persona asignada cuyo cargo no permite identificarla como mecánico u operario. No participan de la evaluación hasta corregir el vínculo con la matriz.`} />
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Mecánicos</CardTitle>
          <CardDescription>Trabajo asignado y completado en el período seleccionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {mechanics.length === 0
            ? <StatePanel tone="neutral" title="Sin mecánicos con OT en el período" description="No hay trabajo enlazado a personas con cargo de mecánico." />
            : <div className="divide-y border-y">{mechanics.map((worker) => <WorkerRow key={`${worker.name}-${worker.cargo}`} worker={worker} />)}</div>}
        </CardContent>
      </Card>

      {operators.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Operarios</CardTitle>
            <CardDescription>Se muestran como carga de trabajo, sin convertir OT de mantenimiento en una evaluación operacional.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y border-y">{operators.map((worker) => <WorkerRow key={`${worker.name}-${worker.cargo}`} worker={worker} />)}</div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const TechnicianPerformanceBoard = MaintenancePersonnelPerformanceBoard;
