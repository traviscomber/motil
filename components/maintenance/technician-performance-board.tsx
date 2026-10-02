'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Award, CheckCircle2, Clock, AlertTriangle, Wrench, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Regular';
  return 'Bajo';
}

function WorkerRow({ worker, rank }: { worker: MaintenanceWorker; rank: number }) {
  const [open, setOpen] = useState(false);
  const hasScore = worker.performanceScore != null;

  return (
    <div className="border-b last:border-b-0">
      <button className="flex w-full items-center gap-3 px-1 py-3 text-left" onClick={() => setOpen((value) => !value)}>
        <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
          {hasScore ? (rank === 1 ? <Award className="mx-auto h-4 w-4" /> : rank) : '—'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{worker.name}</span>
            <Badge variant="outline">{worker.workerType}</Badge>
          </div>
          <span className="block truncate text-xs text-muted-foreground">{worker.cargo}</span>
        </div>
        {hasScore ? (
          <>
            <span className={`text-xl font-bold tabular-nums ${scoreColor(worker.performanceScore!)}`}>{worker.performanceScore}</span>
            <span className={`hidden text-xs sm:block ${scoreColor(worker.performanceScore!)}`}>{scoreLabel(worker.performanceScore!)}</span>
          </>
        ) : (
          <Badge variant="secondary" className="hidden sm:inline-flex">Sin score aún</Badge>
        )}
        <div className="hidden items-center gap-4 text-sm md:flex">
          <span className="flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />{worker.completed}/{worker.total}</span>
          {worker.overdue > 0 ? <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" />{worker.overdue} vencidas</span> : null}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open ? (
        <div className="border-t px-9 pb-4 pt-3">
          {worker.workerType === 'Operario' ? (
            <StatePanel
              tone="neutral"
              title="Evaluación operacional pendiente de evidencia"
              description="Las OT de mantenimiento se muestran como contexto, pero no generan una nota para operarios. El score se habilitará cuando Producción registre persona, turno y equipo de manera trazable."
            />
          ) : (
            <div className="mb-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Cumplimiento de OT</span><span>{worker.completionRate}%</span></div>
              <Progress value={worker.completionRate} className="h-2" />
            </div>
          )}

          <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
            {[
              ['OT completadas', worker.completed],
              ['Puntualidad', `${worker.timelinessRate}%`],
              ['Vencidas', worker.overdue],
              ['Críticas resueltas', `${worker.criticalCompleted}/${worker.criticalAssigned}`],
            ].map(([label, value]) => <div key={label} className="bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Horas reales</p><p className="font-medium">{worker.totalActualHours} h</p><p className="text-xs text-muted-foreground">Planificadas: {worker.totalPlannedHours} h</p></div>
            <div><p className="text-xs text-muted-foreground">Eficiencia promedio</p><p className="font-medium">{worker.avgEfficiency}%</p><p className="text-xs text-muted-foreground">Planificado / real</p></div>
            <div><p className="text-xs text-muted-foreground">Distribución</p><div className="mt-1 flex flex-wrap gap-1">{worker.preventive > 0 ? <Badge variant="secondary">{worker.preventive} prev</Badge> : null}{worker.corrective > 0 ? <Badge variant="outline">{worker.corrective} corr</Badge> : null}{worker.predictive > 0 ? <Badge variant="outline">{worker.predictive} pred</Badge> : null}</div></div>
          </div>
        </div>
      ) : null}
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
          <h2 className="text-base font-semibold">Desempeño por persona</h2>
          <p className="mt-1 text-sm text-muted-foreground">OT y carga por persona, sin mezclar cargos ni inventar evaluación cuando falta evidencia.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 días</SelectItem><SelectItem value="60">Últimos 60 días</SelectItem><SelectItem value="90">Últimos 90 días</SelectItem><SelectItem value="180">Últimos 6 meses</SelectItem><SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {summary ? (
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Mecánicos', summary.mechanics],
            ['Operarios', summary.operators],
            ['OT con cargo válido', summary.totalWorkOrders],
            ['Completación OT', `${summary.completionRate}%`],
          ].map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
      ) : null}

      {summary?.unclassifiedAssignments ? (
        <StatePanel tone="neutral" title="Asignaciones por clasificar" description={`${summary.unclassifiedAssignments} OT tienen una persona asignada cuyo cargo no permite identificarla como mecánico u operario. No participan de la evaluación hasta corregir el vínculo con la matriz.`} />
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" />Mecánicos</CardTitle>
          <CardDescription>{summary?.scoringMethod?.mechanic || 'Score basado en cumplimiento, eficiencia, puntualidad y resolución de OT críticas.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {mechanics.length === 0 ? <StatePanel tone="neutral" title="Sin mecánicos evaluables" description="No existen OT del período vinculadas a personas con un cargo de mecánico identificable." /> : <div className="border-y">{mechanics.map((worker, index) => <WorkerRow key={`${worker.name}-${worker.cargo}`} worker={worker} rank={index + 1} />)}</div>}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Operarios</CardTitle>
          <CardDescription>{summary?.scoringMethod?.operator || 'La evaluación operacional requiere trazabilidad por persona, turno y equipo.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {operators.length === 0 ? (
            <StatePanel
              tone="neutral"
              title="Sin operarios vinculados todavía"
              description="La matriz actual no entrega operarios identificables en las OT consultadas. No se generará una nota artificial. Cuando Producción vincule persona, turno y equipo, aquí aparecerán cumplimiento operacional, cuidado del equipo, seguridad y reportabilidad."
            />
          ) : (
            <div className="border-y">{operators.map((worker, index) => <WorkerRow key={`${worker.name}-${worker.cargo}`} worker={worker} rank={index + 1} />)}</div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />prev = preventivo</span><span className="flex items-center gap-1"><Wrench className="h-3 w-3" />corr = correctivo</span><span className="flex items-center gap-1"><Wrench className="h-3 w-3" />pred = predictivo</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />MTTR proviene de OT completadas</span>
      </div>
    </div>
  );
}

export const TechnicianPerformanceBoard = MaintenancePersonnelPerformanceBoard;
