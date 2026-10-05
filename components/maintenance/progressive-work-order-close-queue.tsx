'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Camera, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

type QueueRow = {
  work_order_id: string;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  work_type: string | null;
  root_cause: string | null;
  preventive_actions: string | null;
  actual_duration_hours: number | string | null;
  total_cost: number | string | null;
  runtime_evidence_status: string | null;
  missing_runtime_evidence: boolean;
  standard_plan_steps_total: number | string | null;
  standard_plan_steps_completed: number | string | null;
  standard_plan_steps_pending: number | string | null;
  next_plan_step_id: string | null;
  next_plan_step_sequence: number | null;
  next_plan_step_title: string | null;
  next_plan_step_instructions: string | null;
  next_plan_step_control_requirement: string | null;
  next_plan_step_document_reference: string | null;
  ready_to_close: boolean;
  next_action: string;
  asset?: { id: string; asset_code: string | null; name: string | null } | null;
};

type QueueResponse = {
  queue?: QueueRow[];
  summary?: { openOrders: number; readyToClose: number; blocked: number; pendingPlanSteps: number; workOrdersWithPendingPlan: number; missingRootCause: number; missingPreventiveActions: number; missingActualHours: number; missingRuntimeEvidence: number };
  canEdit?: boolean;
};

type EvidenceResponse = {
  evidence?: Array<{ id: string; file_name: string; created_at: string }>;
};

type CloseQueueT = Dictionary['app']['workOrderCloseQueue'];

const ACTION_KEYS: Record<string, keyof CloseQueueT['actionTitles']> = {
  resolve_asset: 'resolveAsset',
  resolve_procurement: 'resolveProcurement',
  resolve_parts: 'resolveParts',
  resolve_materials: 'resolveMaterials',
  resolve_external_services: 'resolveExternalServices',
  resolve_labor: 'resolveLabor',
  reconcile_external_cost: 'reconcileExternalCost',
  complete_standard_plan_step: 'completeStandardPlanStep',
  record_root_cause: 'recordRootCause',
  record_preventive_actions: 'recordPreventiveActions',
  record_actual_hours: 'recordActualHours',
  record_runtime_evidence: 'recordRuntimeEvidence',
  close_work_order: 'closeWorkOrder',
};

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

const fetcher = async (url: string): Promise<QueueResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'request failed');
  return payload;
};

const evidenceFetcher = async (url: string): Promise<EvidenceResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la evidencia.');
  return payload;
};

function localDateTimeValue() { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }

export function ProgressiveWorkOrderCloseQueue({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const t = dictionary.app.workOrderCloseQueue;
  const numberLocale = locale === 'en' ? 'en-US' : 'es-CL';
  const searchParams = useSearchParams();
  const selectedWorkOrderId = searchParams.get('workOrderId');
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>('/api/maintenance/work-order-close-queue', fetcher, { revalidateOnFocus: false });
  const rawQueue = Array.isArray(data?.queue) ? data.queue : [];
  const queue = useMemo(() => selectedWorkOrderId ? [...rawQueue].sort((a,b) => a.work_order_id===selectedWorkOrderId ? -1 : b.work_order_id===selectedWorkOrderId ? 1 : 0) : rawQueue, [rawQueue, selectedWorkOrderId]);
  const current = queue[0] || null;
  const summary = data?.summary;
  const { data: evidenceData, mutate: mutateEvidence } = useSWR<EvidenceResponse>(
    current ? `/api/maintenance/work-orders/${current.work_order_id}/evidence` : null,
    evidenceFetcher,
    { revalidateOnFocus: false },
  );
  const evidenceCount = evidenceData?.evidence?.length || 0;
  const [textValue, setTextValue] = useState('');
  const [hoursValue, setHoursValue] = useState('');
  const [stepObservation, setStepObservation] = useState('');
  const [meterMode, setMeterMode] = useState<'meter_reading'|'not_available'>('meter_reading');
  const [meterValue, setMeterValue] = useState('');
  const [meterRecordedAt, setMeterRecordedAt] = useState(localDateTimeValue());
  const [meterReason, setMeterReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActionError(null); setTextValue(''); setHoursValue(''); setStepObservation('');
    setMeterMode('meter_reading'); setMeterValue(''); setMeterRecordedAt(localDateTimeValue()); setMeterReason('');
    setEvidenceFile(null); setEvidenceCount(0);
    if (!current?.work_order_id) return;
    void fetch(`/api/maintenance/work-orders/${current.work_order_id}/evidence`, { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (response.ok) setEvidenceCount(Array.isArray(payload?.evidence) ? payload.evidence.length : 0);
      });
  }, [current?.work_order_id, current?.next_action, current?.next_plan_step_id]);

  async function request(url: string, body: Record<string, unknown>) {
    setSaving(true); setActionError(null);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t.errors.saveFailed);
      await mutate();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : t.errors.saveFailed); }
    finally { setSaving(false); }
  }

  async function patchCurrent(body: Record<string, unknown>) {
    if (!current) return;
    setSaving(true); setActionError(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${current.work_order_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t.errors.updateFailed);
      await mutate();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : t.errors.updateFailed); }
    finally { setSaving(false); }
  }

  async function uploadEvidence() {
    if (!current || !evidenceFile) return;
    setSaving(true); setActionError(null);
    try {
      const form = new FormData();
      form.append('file', evidenceFile);
      const response = await fetch(`/api/maintenance/work-orders/${current.work_order_id}/evidence`, {
        method: 'POST', credentials: 'include', body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la foto.');
      setEvidenceCount((count) => count + 1);
      setEvidenceFile(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo guardar la foto.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadEvidence(file: File | null) {
    if (!current || !file) return;
    setUploadingEvidence(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/maintenance/work-orders/${current.work_order_id}/evidence`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la evidencia.');
      await mutateEvidence();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo guardar la evidencia.');
    } finally {
      setUploadingEvidence(false);
    }
  }

  async function performNextAction() {
    if (!current) return;
    if (current.next_action === 'complete_standard_plan_step') {
      if (!current.next_plan_step_id) return setActionError(t.errors.notFoundStep);
      return request(`/api/maintenance/work-orders/${current.work_order_id}/standard-plan`, { stepId: current.next_plan_step_id, observation: stepObservation.trim() || null });
    }
    if (current.next_action === 'record_root_cause') { const value=textValue.trim(); if(!value) return setActionError(t.errors.rootCauseRequired); return patchCurrent({ root_cause:value }); }
    if (current.next_action === 'record_preventive_actions') { const value=textValue.trim(); if(!value) return setActionError(t.errors.preventiveRequired); return patchCurrent({ preventive_actions:value }); }
    if (current.next_action === 'record_actual_hours') { const hours=Number(hoursValue); if(!Number.isFinite(hours)||hours<=0) return setActionError(t.errors.hoursInvalid); return patchCurrent({ actual_duration_hours:hours }); }
    if (current.next_action === 'record_runtime_evidence') {
      const body: Record<string, unknown> = { workOrderId: current.work_order_id, mode: meterMode };
      if (meterMode === 'meter_reading') { const meterHours=Number(meterValue); if(!Number.isFinite(meterHours)||meterHours<0) return setActionError(t.errors.meterInvalid); if(!meterRecordedAt) return setActionError(t.errors.meterDateRequired); body.meterHours=meterHours; body.recordedAt=new Date(meterRecordedAt).toISOString(); }
      else { const reason=meterReason.trim(); if(!reason) return setActionError(t.errors.meterReasonRequired); body.unavailableReason=reason; }
      return request('/api/maintenance/work-order-runtime-evidence', body);
    }
    if (current.next_action === 'close_work_order') {
      if (evidenceCount < 1) return setActionError('Agrega al menos una foto como evidencia antes de cerrar.');
      return request(`/api/maintenance/work-orders/${current.work_order_id}/close`, {
        actual_duration_hours:Number(current.actual_duration_hours||0),
        root_cause:current.root_cause,
        preventive_actions:current.preventive_actions,
      });
    }
  }

  function money(value: unknown) { return value == null ? '—' : `$${Number(value).toLocaleString(numberLocale)}`; }
  function metric(value: number | undefined) { return value == null ? '—' : value.toLocaleString(numberLocale); }

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">{t.loading}</CardContent></Card>;
  if (error) return <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-6 text-sm text-destructive">{t.loadError}</CardContent></Card>;

  const actionKey = current ? ACTION_KEYS[current.next_action] : undefined;
  const copy = current ? actionKey ? { title: t.actionTitles[actionKey], description: t.actionDescriptions[actionKey] } : t.fallbackAction : null;
  const inline = current && ['complete_standard_plan_step','record_root_cause','record_preventive_actions','record_actual_hours','record_runtime_evidence','close_work_order'].includes(current.next_action);

  return <div className="space-y-6">
    <section aria-label="Estado de cierre" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {[
        [t.summary.openOrders, metric(summary?.openOrders)],
        [t.summary.readyToClose, metric(summary?.readyToClose)],
        [t.summary.blocked, metric(summary?.blocked)],
        [t.summary.pendingPlanSteps, metric(summary?.pendingPlanSteps)],
      ].map(([label,value]) => <div key={String(label)} className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}
    </section>

    {!current ? <Card className="shadow-none"><CardContent className="flex items-start gap-3 p-6"><CheckCircle2 className="mt-0.5 h-5 w-5"/><div><p className="font-medium">{t.empty.title}</p><p className="mt-1 text-sm text-muted-foreground">{t.empty.description}</p></div></CardContent></Card> : <Card className="shadow-none">
      <CardHeader className="border-b border-border/70 pb-4"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{t.nextActionBadge}</Badge><span className="font-mono text-xs text-muted-foreground">{current.work_order_number||'OT'}</span>{Number(current.standard_plan_steps_total||0)>0 ? <Badge variant="secondary">{fill(t.planBadgeTemplate, { completed: current.standard_plan_steps_completed || 0, total: current.standard_plan_steps_total || 0 })}</Badge> : null}</div><CardTitle className="mt-3 text-xl">{copy?.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{copy?.description}</p></div></CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3"><div><p className="text-xs text-muted-foreground">{t.fields.equipment}</p><p className="mt-1 font-medium">{current.asset?.name||t.noAsset}</p><p className="text-xs text-muted-foreground">{current.asset?.asset_code||''}</p></div><div><p className="text-xs text-muted-foreground">{t.fields.work}</p><p className="mt-1 font-medium">{current.title||t.untitled}</p><p className="text-xs text-muted-foreground">{current.work_type||t.noType} · {current.priority||t.noPriority}</p></div><div><p className="text-xs text-muted-foreground">{t.fields.currentCost}</p><p className="mt-1 font-medium">{money(current.total_cost)}</p><p className="text-xs text-muted-foreground">{t.fields.freezesAtClose}</p></div></div>
        {current.next_action==='complete_standard_plan_step' ? <div className="rounded-lg border p-4"><div className="flex items-center gap-2"><Badge variant="outline">{fill(t.step.badgeTemplate, { n: current.next_plan_step_sequence || '' })}</Badge><p className="font-medium">{current.next_plan_step_title}</p></div>{current.next_plan_step_instructions ? <p className="mt-2 text-sm text-muted-foreground">{current.next_plan_step_instructions}</p> : null}{current.next_plan_step_control_requirement ? <p className="mt-2 text-sm"><span className="font-medium">{t.step.controlLabel}</span> {current.next_plan_step_control_requirement}</p> : null}{current.next_plan_step_document_reference ? <p className="mt-1 text-xs text-muted-foreground">{fill(t.step.documentTemplate, { ref: current.next_plan_step_document_reference })}</p> : null}<textarea className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={stepObservation} onChange={(e)=>setStepObservation(e.target.value)} placeholder={t.step.observationPlaceholder}/></div> : null}
        {(current.next_action==='record_root_cause'||current.next_action==='record_preventive_actions') ? <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={4} value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder={current.next_action==='record_root_cause'?t.placeholders.rootCause:t.placeholders.preventiveActions}/> : null}
        {current.next_action==='record_actual_hours' ? <Input type="number" min="0.01" step="0.25" value={hoursValue} onChange={(e)=>setHoursValue(e.target.value)} placeholder={t.placeholders.actualHours}/> : null}
        {current.next_action==='record_runtime_evidence' ? <div className="space-y-4 rounded-lg border p-4"><div className="flex gap-2"><Button size="sm" variant={meterMode==='meter_reading'?'default':'outline'} onClick={()=>setMeterMode('meter_reading')}>{t.meter.registerReading}</Button><Button size="sm" variant={meterMode==='not_available'?'default':'outline'} onClick={()=>setMeterMode('not_available')}>{t.meter.notAvailable}</Button></div>{meterMode==='meter_reading'?<div className="grid gap-3 md:grid-cols-2"><Input type="number" min="0" step="0.1" value={meterValue} onChange={(e)=>setMeterValue(e.target.value)} placeholder={t.meter.readingPlaceholder}/><Input type="datetime-local" value={meterRecordedAt} onChange={(e)=>setMeterRecordedAt(e.target.value)}/></div>:<textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={meterReason} onChange={(e)=>setMeterReason(e.target.value)} placeholder={t.meter.reasonPlaceholder}/>}</div> : null}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="font-medium">Evidencia de cierre</p>
            <p className="mt-1 text-sm text-muted-foreground">Obligatoria antes de cerrar. Puedes tomar una foto con el celular o subir una imagen existente.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-4 text-center text-sm">
              <Camera className="mb-2 h-5 w-5" />
              <span className="font-medium">Tomar foto</span>
              <span className="text-xs text-muted-foreground">Abrir cámara trasera</span>
              <input className="sr-only" type="file" accept="image/*" capture="environment" disabled={uploadingEvidence} onChange={(event)=>void uploadEvidence(event.target.files?.[0] || null)} />
            </label>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-4 text-center text-sm">
              <ImagePlus className="mb-2 h-5 w-5" />
              <span className="font-medium">Subir foto</span>
              <span className="text-xs text-muted-foreground">Galería o archivo</span>
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={uploadingEvidence} onChange={(event)=>void uploadEvidence(event.target.files?.[0] || null)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{uploadingEvidence ? 'Subiendo evidencia...' : evidenceCount > 0 ? `${evidenceCount} evidencia${evidenceCount === 1 ? '' : 's'} cargada${evidenceCount === 1 ? '' : 's'}.` : 'Aún no hay evidencia cargada.'}</p>
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Evidencia fotográfica</p>
              <p className="text-sm text-muted-foreground">Toma una foto con el celular o selecciona una imagen. Se exige al menos una para cerrar.</p>
            </div>
          </div>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" disabled={!evidenceFile || saving} onClick={() => void uploadEvidence()}>
              <Camera className="mr-2 h-4 w-4" />Subir evidencia
            </Button>
            <span className="text-xs text-muted-foreground">{evidenceCount} foto{evidenceCount === 1 ? '' : 's'} registrada{evidenceCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        {actionError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4"/>{actionError}</div> : null}
        <div className="flex flex-wrap gap-2">{inline && data?.canEdit ? <Button onClick={()=>void performNextAction()} disabled={saving}>{saving?t.actions.saving:current.next_action==='close_work_order'?t.actions.closeFreeze:current.next_action==='complete_standard_plan_step'?t.actions.markStepDone:t.actions.saveContinue}<ArrowRight className="ml-2 h-4 w-4"/></Button> : null}{!inline ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>{t.actions.resolveInSheet}<ArrowRight className="ml-2 h-4 w-4"/></Link></Button> : null}<Button asChild variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>{t.actions.viewOrder}</Link></Button></div>
      </CardContent>
    </Card>}
  </div>;
}
