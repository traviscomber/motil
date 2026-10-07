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
import { WorkOrderEvidenceAndApproval } from '@/components/maintenance/work-order-evidence-and-approval';
import { EntityTimeline } from '@/components/shared/entity-timeline';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { formatWorkOrderNumber } from '@/lib/maintenance/work-order-display';

type WorkOrderDetailT = Dictionary['app']['workOrderDetail'];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'request failed');
  return payload;
};

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

function statusLabel(status: string | null | undefined, t: WorkOrderDetailT) {
  if (status === 'completed') return t.status.completed;
  if (status === 'in_progress') return t.status.inProgress;
  if (status === 'open') return t.status.open;
  if (status === 'planned') return t.status.planned;
  return t.status.none;
}

function assetIdentity(code: string | null | undefined, name: string | null | undefined, t: WorkOrderDetailT) {
  const assetCode = String(code || '').trim();
  const assetName = String(name || '').trim();
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (assetName && assetCode && normalize(assetName) !== normalize(assetCode)) return `${assetCode} · ${assetName}`;
  return assetName || assetCode || t.noAsset;
}

function priorityLabel(priority: string | null | undefined, t: WorkOrderDetailT) {
  const labels: Record<string, string> = { low: t.priority.low, medium: t.priority.medium, high: t.priority.high, critical: t.priority.critical };
  return labels[priority || ''] || t.priority.none;
}

function typeLabel(type: string | null | undefined, t: WorkOrderDetailT) {
  const labels: Record<string, string> = {
    corrective: t.workType.corrective,
    correctivo: t.workType.corrective,
    preventive: t.workType.preventive,
    preventivo: t.workType.preventive,
    predictive: t.workType.predictive,
    predictivo: t.workType.predictive,
    inspection: t.workType.inspection,
  };
  return labels[type || ''] || t.workType.none;
}

export function WorkOrderDetail({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const t = dictionary.app.workOrderDetail;
  const dateLocale = locale === 'en' ? 'en-US' : 'es-CL';
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/maintenance/work-orders/${id}` : null, fetcher);
  const { data: viewer, isLoading: viewerLoading } = useSWR('/api/maintenance/viewer-context', fetcher);
  const workOrder = data?.data;
  const costCenters = data?.costCenters || [];
  const assignees = data?.assignees || [];
  const isHistorical = workOrder?.record_scope === 'historical' || data?.record_scope === 'historical';
  const canEdit = Boolean(data?.canEdit) && !isHistorical;
  const selectedCostCenter = costCenters.find((row: { id: string }) => row.id === workOrder?.cost_center_id);
  const isExecution = viewer?.mode === 'execution';

  const patchOrder = async (payload: Record<string, unknown>) => {
    if (isHistorical) throw new Error('historical work order is read-only');
    const response = await fetch(`/api/maintenance/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'request failed');
    await mutate();
  };

  if (isLoading || viewerLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!workOrder) {
    return <Card className="shadow-none"><CardContent className="p-10 text-center"><p className="font-medium">{error ? t.loadFailed : t.notAvailable}</p><Button asChild variant="outline" className="mt-4"><Link href="/dashboard/mantenimiento/ordenes-trabajo">{t.backToOrders}</Link></Button></CardContent></Card>;
  }

  if (isExecution) {
    return (
      <div className="space-y-4 py-2 sm:py-6">
        <MobileWorkOrderFlow
          workOrderId={id}
          workOrderNumber={formatWorkOrderNumber(workOrder.work_order_number, locale)}
          title={workOrder.title}
          assetName={workOrder.asset_name || t.noAsset}
          description={workOrder.description}
          status={workOrder.status}
          assignedPersonId={workOrder.assigned_person_id}
          canEdit={canEdit}
          onWorkOrderChange={mutate}
        />
        <div className="mx-auto w-full max-w-xl">
          <WorkOrderEvidenceAndApproval workOrderId={id} status={workOrder.status} />
        </div>
      </div>
    );
  }

  if (viewer?.mode === 'planning' && !isHistorical) {
    const preparationReady = Boolean(workOrder.assigned_person_id && workOrder.cost_center_id);
    const isStarted = workOrder.status === 'in_progress' || workOrder.status === 'completed';
    const isCompleted = workOrder.status === 'completed';
    const nextAction = !workOrder.assigned_person_id
      ? t.assigneeCard.pending
      : !workOrder.cost_center_id
        ? t.financial.pending
        : !isStarted
          ? t.actions.startWork
          : !isCompleted
            ? t.actions.continueClose
            : t.status.completed;

    return <div className="mx-auto max-w-5xl space-y-5">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{formatWorkOrderNumber(workOrder.work_order_number, locale)}</span>
            <Badge variant="outline">{statusLabel(workOrder.status, t)}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{workOrder.title || t.untitled}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{assetIdentity(workOrder.asset_code, workOrder.asset_name, t)}</p>
        </div>
        <Button asChild variant="outline"><Link href={`/dashboard/mantenimiento/equipos/${workOrder.canonical_asset_id || workOrder.asset_id}`}>Ficha 360</Link></Button>
      </section>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Seguimiento simple</CardTitle>
          <p className="text-sm text-muted-foreground">Próximo paso: <span className="font-medium text-foreground">{nextAction}</span></p>
        </CardHeader>
        <CardContent>
          <div className="grid overflow-hidden rounded-lg border sm:grid-cols-3">
            <div className={`p-4 ${preparationReady ? 'bg-muted/30' : ''}`}>
              <p className="text-xs text-muted-foreground">01</p>
              <p className="mt-2 font-medium">Preparar</p>
              <p className="mt-1 text-xs text-muted-foreground">{preparationReady ? 'Responsable e imputación listos' : 'Asignar responsable e imputación'}</p>
            </div>
            <div className={`border-t p-4 sm:border-l sm:border-t-0 ${isStarted ? 'bg-muted/30' : ''}`}>
              <p className="text-xs text-muted-foreground">02</p>
              <p className="mt-2 font-medium">Ejecutar</p>
              <p className="mt-1 text-xs text-muted-foreground">{isStarted ? 'Trabajo iniciado' : 'Iniciar cuando esté preparado'}</p>
            </div>
            <div className={`border-t p-4 sm:border-l sm:border-t-0 ${isCompleted ? 'bg-muted/30' : ''}`}>
              <p className="text-xs text-muted-foreground">03</p>
              <p className="mt-2 font-medium">Cerrar</p>
              <p className="mt-1 text-xs text-muted-foreground">{isCompleted ? 'OT cerrada' : 'Validar evidencia y cerrar'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base">Preparación</CardTitle></CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assignee">{t.assigneeCard.label}</Label>
            <select id="assignee" value={workOrder.assigned_person_id || ''} disabled={!canEdit || isCompleted} onChange={(event) => void patchOrder({ assigned_person_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{t.assigneeCard.unassigned}</option>
              {assignees.map((row: { id: string; full_name: string; role_title?: string | null }) => <option key={row.id} value={row.id}>{row.full_name}{row.role_title ? ` · ${row.role_title}` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-center">{t.financial.label}</Label>
            <select id="cost-center" value={workOrder.cost_center_id || ''} disabled={!canEdit || isCompleted} onChange={(event) => void patchOrder({ cost_center_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{t.financial.none}</option>
              {costCenters.map((row: { id: string; code: string; name: string }) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2 flex flex-wrap gap-2">
            {!isStarted ? <Button onClick={() => void patchOrder({ status: 'in_progress' })} disabled={!canEdit || !preparationReady}><PlayCircle className="mr-2 h-4 w-4" />{t.actions.startWork}</Button> : null}
            {workOrder.status === 'in_progress' ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${id}`}><CheckCircle2 className="mr-2 h-4 w-4" />{t.actions.continueClose}</Link></Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base">Trabajo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-6">{workOrder.description || t.intervention.noDescription}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">{t.summary.type}</p><p className="mt-1 font-medium">{typeLabel(workOrder.work_type, t)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t.summary.priority}</p><p className="mt-1 font-medium">{priorityLabel(workOrder.priority, t)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t.summary.scheduled}</p><p className="mt-1 font-medium">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString(dateLocale) : t.summary.noDate}</p></div>
          </div>
        </CardContent>
      </Card>

      <WorkOrderEvidenceAndApproval workOrderId={id} status={workOrder.status} />

      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium">
          Ver detalle técnico y abastecimiento
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="space-y-5 border-t p-5">
          <WorkOrderExecutionReadiness workOrderId={id} assignedToName={workOrder.assigned_to_name} status={workOrder.status} />
          <WorkOrderStandardPlanPanel workOrderId={id} />
          <WorkOrderMaterialCoverage workOrderId={id} />
          <WorkOrderPartsPanel workOrderId={id} />
          <WorkOrderPurchasingFlow workOrderId={id} />
          <WorkOrderExecutionPanel workOrderId={id} />
          <EntityTimeline entity="work_order" id={id} limit={50} />
        </div>
      </details>
    </div>;
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-2"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Link></Button><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{formatWorkOrderNumber(workOrder.work_order_number, locale)}</span><Badge variant="outline">{statusLabel(workOrder.status, t)}</Badge>{isHistorical ? <Badge variant="secondary">{t.historicalBadge}</Badge> : <Badge variant="outline">{t.operationalBadge}</Badge>}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{workOrder.title || t.untitled}</h1><p className="mt-2 text-sm text-muted-foreground">{assetIdentity(workOrder.asset_code, workOrder.asset_name, t)}</p></div>
      {!isHistorical ? <div className="flex gap-2">{workOrder.status !== 'in_progress' && workOrder.status !== 'completed' ? <Button onClick={() => void patchOrder({ status: 'in_progress' })} disabled={!canEdit || !workOrder.assigned_person_id}><PlayCircle className="mr-2 h-4 w-4" />{t.actions.startWork}</Button> : null}{workOrder.status === 'in_progress' ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${id}`}><CheckCircle2 className="mr-2 h-4 w-4" />{t.actions.continueClose}</Link></Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={t.actions.moreActions}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!canEdit} onClick={() => void patchOrder({ status: 'open' })}><RotateCcw className="mr-2 h-4 w-4" />{t.actions.reopen}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div> : null}
    </section>

    {isHistorical ? <Card className="border-muted-foreground/20 bg-muted/20 shadow-none"><CardContent className="flex items-start gap-3 p-4"><History className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{t.historicalCard.title}</p><p className="mt-1 text-sm text-muted-foreground">{t.historicalCard.description}</p></div></CardContent></Card> : null}

    <Card className="shadow-none"><CardHeader><CardTitle className="text-base">{t.summary.title} {isHistorical ? t.summary.historicalSuffix : t.summary.operationalSuffix}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><div><p className="text-xs text-muted-foreground">{t.summary.status}</p><p className="mt-1 font-medium">{statusLabel(workOrder.status, t)}</p></div><div><p className="text-xs text-muted-foreground">{t.summary.priority}</p><p className="mt-1 font-medium">{priorityLabel(workOrder.priority, t)}</p></div><div><p className="text-xs text-muted-foreground">{t.summary.type}</p><p className="mt-1 font-medium">{typeLabel(workOrder.work_type, t)}</p></div><div><p className="text-xs text-muted-foreground">{t.summary.assignee}</p><p className="mt-1 font-medium">{workOrder.assigned_to_name || t.summary.unassigned}</p></div><div><p className="text-xs text-muted-foreground">{t.summary.scheduled}</p><p className="mt-1 font-medium">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString(dateLocale) : t.summary.noDate}</p></div><div><p className="text-xs text-muted-foreground">{t.summary.initialReading}</p><p className="mt-1 font-medium">{workOrder.meter_reading ? `${workOrder.meter_reading} ${workOrder.meter_unit || ''}` : t.summary.noReading}</p></div></CardContent></Card>

    {!isHistorical ? <WorkOrderExecutionReadiness workOrderId={id} assignedToName={workOrder.assigned_to_name} status={workOrder.status} /> : null}

    {!isHistorical ? <Card className="shadow-none"><CardHeader><CardTitle className="text-base">{t.assigneeCard.title}</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="assignee">{t.assigneeCard.label}</Label><select id="assignee" value={workOrder.assigned_person_id || ''} disabled={!canEdit || workOrder.status === 'completed'} onChange={(event) => void patchOrder({ assigned_person_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">{t.assigneeCard.unassigned}</option>{assignees.map((row: { id: string; full_name: string; role_title?: string | null }) => <option key={row.id} value={row.id}>{row.full_name}{row.role_title ? ` · ${row.role_title}` : ''}</option>)}</select></div><div className="pb-2 text-sm"><span className={workOrder.assigned_person_id ? 'text-foreground' : 'text-destructive'}>{workOrder.assigned_person_id ? t.assigneeCard.ready : t.assigneeCard.pending}</span></div></div></CardContent></Card> : null}

    {!isHistorical ? <Card className="shadow-none"><CardHeader><CardTitle className="text-base">{t.financial.title}</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="cost-center">{t.financial.label}</Label><select id="cost-center" value={workOrder.cost_center_id || ''} disabled={!canEdit} onChange={(event) => void patchOrder({ cost_center_id: event.target.value || null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">{t.financial.none}</option>{costCenters.map((row: { id: string; code: string; name: string }) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div><div className="pb-2 text-sm"><span className={workOrder.cost_center_id ? 'text-foreground' : 'text-destructive'}>{workOrder.cost_center_id ? fill(t.financial.readyTemplate, { code: selectedCostCenter?.code || t.financial.readyDefault }) : t.financial.pending}</span></div></div></CardContent></Card> : null}

    <Card className="shadow-none"><CardHeader><CardTitle className="text-base">{t.intervention.title}</CardTitle></CardHeader><CardContent className={isHistorical ? '' : 'grid gap-5 lg:grid-cols-[1fr_320px]'}><div><p className="text-sm leading-6">{workOrder.description || t.intervention.noDescription}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">{t.intervention.rootCause}</p><p className="mt-1 text-sm font-medium">{workOrder.root_cause || (isHistorical ? t.intervention.noEvidence : t.intervention.pendingClose)}</p></div><div><p className="text-xs text-muted-foreground">{t.intervention.preventiveAction}</p><p className="mt-1 text-sm font-medium">{workOrder.preventive_actions || (isHistorical ? t.intervention.noEvidence : t.intervention.pendingClose)}</p></div></div></div>{!isHistorical ? <WorkOrderTimer workOrderId={id} /> : null}</CardContent></Card>

    {!isHistorical ? <>
      <WorkOrderStandardPlanPanel workOrderId={id} />
      <WorkOrderMaterialCoverage workOrderId={id} />
      <WorkOrderPartsPanel workOrderId={id} />
      <WorkOrderPurchasingFlow workOrderId={id} />
      <WorkOrderExecutionPanel workOrderId={id} />
    </> : null}
    {!isHistorical ? <WorkOrderEvidenceAndApproval workOrderId={id} status={workOrder.status} /> : null}
    <EntityTimeline entity="work_order" id={id} limit={50} />
  </div>;
}
