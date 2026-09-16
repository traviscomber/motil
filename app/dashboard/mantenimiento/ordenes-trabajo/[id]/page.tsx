'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, History, MoreHorizontal, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { WorkOrderExecutionPanel } from '@/components/maintenance/work-order-execution-panel';
import { WorkOrderExecutionReadiness } from '@/components/maintenance/work-order-execution-readiness';
import { WorkOrderMaterialCoverage } from '@/components/maintenance/work-order-material-coverage';
import { WorkOrderPartsPanel } from '@/components/maintenance/work-order-parts-panel';
import { WorkOrderPurchasingFlow } from '@/components/maintenance/work-order-purchasing-flow';
import { WorkOrderStandardPlanPanel } from '@/components/maintenance/work-order-standard-plan-panel';
import { WorkOrderTimer } from '@/components/maintenance/work-order-timer';
import { MobileWorkOrderFlow } from '@/components/maintenance/mobile-work-order-flow';
import { EntityTimeline } from '@/components/shared/entity-timeline';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la orden de trabajo');
  return payload;
};

function statusLabel(status?: string) {
  if (status === 'completed') return 'Completada';
  if (status === 'in_progress') return 'En ejecución';
  if (status === 'open') return 'Abierta';
  if (status === 'planned') return 'Planificada';
  return status || 'Sin estado';
}

function priorityLabel(priority?: string) {
  const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
  return labels[priority || ''] || priority || 'Sin prioridad';
}

function typeLabel(type?: string) {
  const labels: Record<string, string> = {
    corrective: 'Correctiva',
    correctivo: 'Correctiva',
    preventive: 'Preventiva',
    preventivo: 'Preventiva',
    predictive: 'Predictiva',
    predictivo: 'Predictiva',
    inspection: 'Inspección',
  };
  return labels[type || ''] || type || 'Sin tipo';
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/maintenance/work-orders/${id}` : null, fetcher);
  const { data: viewer, isLoading: viewerLoading } = useSWR('/api/maintenance/viewer-context', fetcher);
  const workOrder = data?.data;
  const costCenters = data?.costCenters || [];
  const assignees = data?.assignees || [];
  const isHistorical = workOrder?.record_scope === 'historical' || data?.record_scope === 'historical';
  const canEdit = Boolean(data?.canEdit) && !isHistorical;
  const selectedCostCenter = costCenters.find((row: any) => row.id === workOrder?.cost_center_id);
  const isExecution = viewer?.mode === 'execution';

  const patchOrder = async (payload: Record<string, unknown>) => {
    if (isHistorical) throw new Error('La OT pertenece al histórico importado y es de solo lectura.');
    const response = await fetch(`/api/maintenance/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'No se pudo actualizar la orden');
    await mutate();
  };

  if (isLoading || viewerLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!workOrder) {
    return <Card className="shadow-none"><CardContent className="p-10 text-center"><p className="font-medium">{error ? 'No se pudo cargar la orden' : 'Orden no disponible'}</p><Button asChild variant="outline" className="mt-4"><Link href="/dashboard/mantenimiento/ordenes-trabajo">Volver a órdenes</Link></Button></CardContent></Card>;
  }

  if (isExecution) {
    return (
      <div className="py-2 sm:py-6">
        <MobileWorkOrderFlow
          workOrderId={id}
          workOrderNumber={workOrder.work_order_number}
          title={workOrder.title}
          assetName={workOrder.asset_name || workOrder.asset_code}
          description={workOrder.description}
          status={workOrder.status}
          assignedPersonId={workOrder.assigned_person_id}
          canEdit={canEdit}
          onWorkOrderChange={mutate}
        />
      </div>
    );
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-2"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />Órdenes de trabajo</Link></Button><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{workOrder.work_order_number}</span><Badge variant="outline">{statusLabel(workOrder.status)}</Badge>{isHistorical ? <Badge variant="secondary">Histórico</Badge> : <Badge variant="outline">Operación Motil</Badge>}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{workOrder.title || 'Orden de trabajo'}</h1><p className="mt-2 text-sm text-muted-foreground">{workOrder.asset_code || 'Sin código'} · {workOrder.asset_name || 'Sin equipo asociado'}</p></div>
      {!isHistorical ? <div className="flex gap-2">{workOrder.status !== 'in_progress' && workOrder.status !== 'completed' ? <Button onClick={() => void patchOrder({ status: 'in_progress' })} disabled={!canEdit || !workOrder.assigned_person_id}><PlayCircle className="mr-2 h-4 w-4" />Iniciar trabajo</Button> : null}{workOrder.status === 'in_progress' ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${id}`}><CheckCircle2 className="mr-2 h-4 w-4" />Continuar cierre</Link></Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Más acciones"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!canEdit} onClick={() => void patchOrder({ status: 'open' })}><RotateCcw className="mr-2 h-4 w-4" />Reabrir orden</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div> : null}
    </section>

    {isHistorical ? <Card className="border-muted-foreground/20 bg-muted/20 shadow-none"><CardContent className="flex items-start gap-3 p-4"><History className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Histórico importado · solo lectura</p><p className="mt-1 text-sm text-muted-foreground">Este registro se conserva como evidencia previa a la operación de Motil. No puede iniciarse, reabrirse, cerrarse, temporizarse ni recibir nuevos materiales, repuestos, mano de obra, servicios o pasos de plan.</p></div></CardContent></Card> : null}

    <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Resumen {isHistorical ? 'histórico' : 'operativo'}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><div><p className="text-xs text-muted-foreground">Estado</p><p className="mt-1 font-medium">{statusLabel(workOrder.status)}</p></div><div><p className="text-xs text-muted-foreground">Prioridad</p><p className="mt-1 font-medium">{priorityLabel(workOrder.priority)}</p></div><div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 font-medium">{typeLabel(workOrder.work_type)}</p></div><div><p className="text-xs text-muted-foreground">Responsable</p><p className="mt-1 font-medium">{workOrder.assigned_to_name || 'Sin asignar'}</p></div><div><p className="text-xs text-muted-foreground">Programada</p><p className="mt-1 font-medium">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</p></div><div><p className="text-xs text-muted-foreground">Lectura inicial</p><p className="mt-1 font-medium">{workOrder.meter_reading ? `${workOrder.meter_reading} ${workOrder.meter_unit || ''}` : 'Sin lectura'}</p></div></CardContent></Card>

    {!isHistorical ? <WorkOrderExecutionReadiness workOrderId={id} assignedToName={workOrder.assigned_to_name} status={workOrder.status} /> : null}

    {!isHistorical ? <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Responsable operativo</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="assignee">Persona asignada</Label><select id="assignee" value={workOrder.assigned_person_id || ''} disabled={!canEdit || workOrder.status === 'completed'} onChange={(event) => void patchOrder({ assigned_person_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Sin asignar</option>{assignees.map((row: any) => <option key={row.id} value={row.id}>{row.full_name}{row.role_title ? ` · ${row.role_title}` : ''}</option>)}</select></div><div className="pb-2 text-sm"><span className={workOrder.assigned_person_id ? 'text-foreground' : 'text-destructive'}>{workOrder.assigned_person_id ? 'Asignación canónica lista para ejecución móvil.' : 'Debe asignarse una persona operativa antes de iniciar.'}</span></div></div></CardContent></Card> : null}

    {!isHistorical ? <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Imputación financiera</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="cost-center">Centro de costo</Label><select id="cost-center" value={workOrder.cost_center_id || ''} disabled={!canEdit} onChange={(event) => void patchOrder({ cost_center_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Sin centro de costo</option>{costCenters.map((row: any) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div><div className="pb-2 text-sm"><span className={workOrder.cost_center_id ? 'text-foreground' : 'text-destructive'}>{workOrder.cost_center_id ? `Imputación lista: ${selectedCostCenter?.code || 'centro asignado'}` : 'Pendiente: Compras no podrá adjudicar una OC asociada a esta OT.'}</span></div></div></CardContent></Card> : null}

    <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Intervención</CardTitle></CardHeader><CardContent className={isHistorical ? '' : 'grid gap-5 lg:grid-cols-[1fr_320px]'}><div><p className="text-sm leading-6">{workOrder.description || 'Sin descripción adicional.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Causa principal</p><p className="mt-1 text-sm font-medium">{workOrder.root_cause || (isHistorical ? 'Sin evidencia cargada' : 'Pendiente en cierre progresivo')}</p></div><div><p className="text-xs text-muted-foreground">Acción preventiva</p><p className="mt-1 text-sm font-medium">{workOrder.preventive_actions || (isHistorical ? 'Sin evidencia cargada' : 'Pendiente en cierre progresivo')}</p></div></div></div>{!isHistorical ? <WorkOrderTimer workOrderId={id} /> : null}</CardContent></Card>

    {!isHistorical ? <>
      <WorkOrderStandardPlanPanel workOrderId={id} />
      <WorkOrderMaterialCoverage workOrderId={id} />
      <WorkOrderPartsPanel workOrderId={id} />
      <WorkOrderPurchasingFlow workOrderId={id} />
      <WorkOrderExecutionPanel workOrderId={id} />
    </> : null}
    <EntityTimeline entity="work_order" id={id} limit={50} />
  </div>;
}
