export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkOrderRow = {
  id: string;
  work_order_number: string;
  assigned_person_id: string | null;
  assigned_to_name: string | null;
  status: string | null;
  work_type: string | null;
  priority: string | null;
  planned_duration_hours: number | string | null;
  actual_duration_hours: number | string | null;
  scheduled_date: string | null;
  completion_date: string | null;
};

type WorkerType = 'Mecánico' | 'Operario';

function safeNum(value: number | string | null | undefined): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function classifyWorker(cargo: string | null | undefined): WorkerType | null {
  const value = normalize(cargo);
  if (!value) return null;
  if (/\bmecanico\b/.test(value)) return 'Mecánico';
  if (/\boperario\b|\boperador\b/.test(value)) return 'Operario';
  return null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const url = new URL(request.url);
    const days = Math.min(365, Math.max(7, parseInt(url.searchParams.get('days') ?? '60', 10)));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: workOrders, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,work_order_number,assigned_person_id,assigned_to_name,status,work_type,priority,planned_duration_hours,actual_duration_hours,scheduled_date,completion_date')
      .eq('organization_id', context.organizationId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: people, error: peopleError } = await context.supabase
      .from('people')
      .select('id,full_name,role_title,employment_status')
      .eq('organization_id', context.organizationId)
      .eq('employment_status', 'active');
    if (peopleError) throw peopleError;

    const peopleMap = new Map<string, { name: string; cargoName: string; workerType: WorkerType | null }>();
    for (const person of people || []) {
      const cargoName = String(person.role_title || 'Sin cargo');
      peopleMap.set(String(person.id), {
        name: String(person.full_name || '').trim(),
        cargoName,
        workerType: classifyWorker(cargoName),
      });
    }

    const rows = (Array.isArray(workOrders) ? workOrders : []) as WorkOrderRow[];
    const assignedRows = rows.filter((row) => Boolean(row.assigned_person_id));
    const eligibleRows = assignedRows.filter((row) => peopleMap.get(String(row.assigned_person_id))?.workerType);
    const unclassifiedAssignments = assignedRows.length - eligibleRows.length;

    const workerMap = new Map<string, {
      name: string;
      cargo: string;
      workerType: WorkerType;
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
      efficiencyScores: number[];
      criticalAssigned: number;
      criticalCompleted: number;
    }>();

    const now = Date.now();
    for (const workOrder of eligibleRows) {
      const person = peopleMap.get(String(workOrder.assigned_person_id))!;
      const name = person.name || workOrder.assigned_to_name?.trim() || 'Sin nombre';
      const workerType = person.workerType!;
      const key = String(workOrder.assigned_person_id);
      const existing = workerMap.get(key) ?? {
        name,
        cargo: person.cargoName,
        workerType,
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        preventive: 0,
        corrective: 0,
        predictive: 0,
        totalPlannedHours: 0,
        totalActualHours: 0,
        efficiencyScores: [],
        criticalAssigned: 0,
        criticalCompleted: 0,
      };

      existing.total += 1;
      const status = normalize(workOrder.status);
      if (status === 'completed') existing.completed += 1;
      else if (status === 'in_progress') existing.inProgress += 1;
      else existing.pending += 1;

      if (workOrder.scheduled_date && status !== 'completed' && new Date(workOrder.scheduled_date).getTime() < now) existing.overdue += 1;

      const workType = normalize(workOrder.work_type);
      if (workType.includes('prevent')) existing.preventive += 1;
      else if (workType.includes('correct')) existing.corrective += 1;
      else if (workType.includes('predict')) existing.predictive += 1;

      const planned = safeNum(workOrder.planned_duration_hours);
      const actual = safeNum(workOrder.actual_duration_hours);
      existing.totalPlannedHours += planned;
      existing.totalActualHours += actual;
      if (status === 'completed' && planned > 0 && actual > 0) existing.efficiencyScores.push(planned / actual);

      const critical = ['critical', 'high'].includes(normalize(workOrder.priority));
      if (critical) {
        existing.criticalAssigned += 1;
        if (status === 'completed') existing.criticalCompleted += 1;
      }
      workerMap.set(key, existing);
    }

    const workers = Array.from(workerMap.values()).map((worker) => {
      const completionRate = worker.total > 0 ? Math.round((worker.completed / worker.total) * 100) : 0;
      const avgEfficiency = worker.efficiencyScores.length > 0
        ? Math.round((worker.efficiencyScores.reduce((sum, value) => sum + value, 0) / worker.efficiencyScores.length) * 100)
        : 0;
      const timelinessRate = worker.total > 0 ? Math.max(0, Math.round(((worker.total - worker.overdue) / worker.total) * 100)) : 0;
      const criticalResolutionRate = worker.criticalAssigned > 0
        ? Math.round((worker.criticalCompleted / worker.criticalAssigned) * 100)
        : 100;

      // Sólo los mecánicos reciben score OT. Para operarios, las OT no representan su trabajo operacional
      // y no deben producir una evaluación engañosa hasta que producción registre persona/turno/equipo.
      const performanceScore = worker.workerType === 'Mecánico'
        ? Math.min(100, Math.round(
            completionRate * 0.4
            + Math.min(100, avgEfficiency || completionRate) * 0.25
            + timelinessRate * 0.2
            + criticalResolutionRate * 0.15
          ))
        : null;

      return {
        ...worker,
        totalPlannedHours: Math.round(worker.totalPlannedHours * 10) / 10,
        totalActualHours: Math.round(worker.totalActualHours * 10) / 10,
        completionRate,
        avgEfficiency,
        timelinessRate,
        criticalResolutionRate,
        performanceScore,
        evaluationStatus: worker.workerType === 'Mecánico' ? 'scored' : 'awaiting_operational_evidence',
        efficiencyScores: undefined,
      };
    }).sort((a, b) => {
      if (a.performanceScore == null && b.performanceScore == null) return a.name.localeCompare(b.name);
      if (a.performanceScore == null) return 1;
      if (b.performanceScore == null) return -1;
      return b.performanceScore - a.performanceScore;
    });

    const completedRows = eligibleRows.filter((row) => normalize(row.status) === 'completed');
    const rowsWithActualDuration = completedRows.filter((row) => safeNum(row.actual_duration_hours) > 0);
    const avgMTTR = rowsWithActualDuration.reduce((sum, row) => sum + safeNum(row.actual_duration_hours), 0) / Math.max(1, rowsWithActualDuration.length);
    const mechanics = workers.filter((worker) => worker.workerType === 'Mecánico').length;
    const operators = workers.filter((worker) => worker.workerType === 'Operario').length;

    const summary = {
      totalWorkOrders: eligibleRows.length,
      completedWorkOrders: completedRows.length,
      completionRate: eligibleRows.length > 0 ? Math.round((completedRows.length / eligibleRows.length) * 100) : 0,
      avgMTTR: Math.round(avgMTTR * 10) / 10,
      activeWorkers: workers.length,
      mechanics,
      operators,
      unclassifiedAssignments,
      periodDays: days,
      scoringMethod: {
        mechanic: '40% cumplimiento OT + 25% eficiencia de horas + 20% puntualidad + 15% resolución crítica',
        operator: 'Pendiente de evidencia operacional por persona/turno/equipo; no se infiere desde OT de mantenimiento',
      },
    };

    return NextResponse.json({ workers, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar desempeño de mecánicos y operarios';
    console.error('[maintenance/personnel/performance]', error);
    return NextResponse.json({ workers: [], error: message }, { status: 500 });
  }
}
