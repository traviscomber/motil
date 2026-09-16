'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';

type Asset = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  model: string | null;
};

type DrillingReview = {
  review_id: string;
  source_report_id: string;
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  operation_date: string | null;
  review_reason: string;
  equipment_status_raw: string | null;
  machine_observations: string | null;
  review_status: string;
  linked_work_order_id: string | null;
  has_linked_work_order: boolean;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los datos.');
  return payload;
};

const assetStatusLabels: Record<string, string> = {
  active: 'Disponible',
  operational: 'Operativo',
  maintenance: 'En mantenimiento',
  inactive: 'Fuera de servicio',
};

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const reviewId = searchParams.get('reviewId') || '';
  const [canonicalAssetId, setCanonicalAssetId] = useState(initialAssetId);
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [requestedMaterials, setRequestedMaterials] = useState('');
  const [workType, setWorkType] = useState(searchParams.get('workType') || 'preventive');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'medium');
  const [scheduledDate, setScheduledDate] = useState(searchParams.get('scheduledDate') || new Date().toISOString().slice(0, 10));
  const [plannedHours, setPlannedHours] = useState(searchParams.get('plannedDurationHours') || '');
  const [assignedToName, setAssignedToName] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [meterUnit, setMeterUnit] = useState('hours');
  const [submitting, setSubmitting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/equipment', fetcher, { revalidateOnFocus: false });
  const {
    data: reviewData,
    error: reviewError,
    isLoading: reviewLoading,
  } = useSWR(reviewId ? `/api/maintenance/drilling-reviews/${reviewId}` : null, fetcher, { revalidateOnFocus: false });

  const assets = useMemo(() => (Array.isArray(data?.equipment) ? (data.equipment as Asset[]) : []), [data]);
  const selectedAsset = assets.find((asset) => asset.id === canonicalAssetId) || null;
  const review = (reviewData?.review || null) as DrillingReview | null;

  useEffect(() => {
    if (!review) return;
    if (!canonicalAssetId && review.canonical_asset_id) setCanonicalAssetId(review.canonical_asset_id);
    if (!title.trim()) {
      setTitle(`Reparación correctiva · ${review.asset_name || review.asset_code || 'equipo de sondaje'}`);
    }
    if (!description.trim()) {
      setDescription([
        review.equipment_status_raw ? `Estado reportado: ${review.equipment_status_raw}.` : null,
        review.machine_observations ? `Observación de Sondaje: ${review.machine_observations}` : null,
        review.operation_date ? `Fecha del reporte: ${review.operation_date}.` : null,
      ].filter(Boolean).join('\n'));
    }
  }, [review, canonicalAssetId, title, description]);

  const validate = () => {
    if (!canonicalAssetId) return 'Selecciona el equipo que requiere el trabajo.';
    if (review && review.canonical_asset_id !== canonicalAssetId) return 'La revisión de Sondaje corresponde a otro equipo.';
    if (!title.trim()) return 'Describe brevemente el trabajo a realizar.';
    if (!scheduledDate) return 'Selecciona una fecha programada.';
    if (plannedHours && (!Number.isFinite(Number(plannedHours)) || Number(plannedHours) < 0)) {
      return 'Las horas planificadas deben ser un valor igual o mayor que cero.';
    }
    if (meterReading && (!Number.isFinite(Number(meterReading)) || Number(meterReading) < 0)) {
      return 'La lectura inicial debe ser un valor igual o mayor que cero.';
    }
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) return toast.error(validationError);

    setSubmitting(true);
    try {
      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canonicalAssetId,
          reviewId: reviewId || null,
          title: title.trim(),
          description: description.trim() || null,
          requestedMaterials: requestedMaterials.trim() || null,
          workType,
          priority,
          scheduledDate,
          plannedDurationHours: plannedHours ? Number(plannedHours) : 0,
          assignedToName: assignedToName.trim() || null,
          meterReading: meterReading ? Number(meterReading) : null,
          meterUnit: meterReading ? meterUnit : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible crear la orden.');
      toast.success(reviewId ? 'Orden creada y revisión de Sondaje vinculada' : 'Orden de trabajo creada');
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/${payload.data.id}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'No fue posible crear la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento</PageHeaderEyebrow>
          <PageHeaderTitle>Crear orden de trabajo</PageHeaderTitle>
          <PageHeaderDescription>
            {reviewId
              ? 'Convierte una condición crítica reportada por Sondaje en una OT trazable. Al crearla, la revisión quedará vinculada automáticamente.'
              : 'Registra el equipo, el trabajo requerido y la planificación inicial. Los repuestos solicitados quedan trazados sin bloquear la OT por stock durante la puesta en marcha.'}
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar los equipos"
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0 py-5"
        />
      ) : null}

      {reviewError ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar la revisión de Sondaje"
          description={reviewError.message}
          className="min-h-0 py-5"
        />
      ) : null}

      {reviewId && !reviewError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Origen · Sondaje</CardTitle>
            <CardDescription>
              {reviewLoading ? 'Cargando evidencia operacional…' : 'Esta evidencia quedará trazada con la orden de trabajo.'}
            </CardDescription>
          </CardHeader>
          {review ? (
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Equipo reportado</p><p className="font-medium">{review.asset_name || review.asset_code || 'Sin nombre'}</p></div>
              <div><p className="text-xs text-muted-foreground">Fecha del reporte</p><p className="font-medium">{review.operation_date || 'Sin fecha'}</p></div>
              <div><p className="text-xs text-muted-foreground">Estado</p><p className="font-medium">{review.equipment_status_raw || 'Sin estado'}</p></div>
              <div><p className="text-xs text-muted-foreground">Revisión</p><p className="font-medium">{review.review_status === 'pending' ? 'Pendiente · se resolverá al crear la OT' : review.review_status}</p></div>
              {review.machine_observations ? <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Observación operacional</p><p className="font-medium">{review.machine_observations}</p></div> : null}
              {review.linked_work_order_id ? (
                <div className="md:col-span-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${review.linked_work_order_id}`}>Abrir OT ya vinculada</Link></Button>
                </div>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Equipo y trabajo</CardTitle>
          <CardDescription>Los campos marcados son necesarios para crear la orden.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="asset">Equipo *</Label>
            <Select value={canonicalAssetId} onValueChange={setCanonicalAssetId} disabled={isLoading || Boolean(error) || Boolean(reviewId)}>
              <SelectTrigger id="asset"><SelectValue placeholder={isLoading ? 'Cargando equipos…' : 'Seleccionar equipo'} /></SelectTrigger>
              <SelectContent>{assets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.code} · {asset.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedAsset ? (
              <p className="text-xs text-muted-foreground">
                {selectedAsset.type}{selectedAsset.model ? ` · ${selectedAsset.model}` : ''} · {assetStatusLabels[selectedAsset.status] || selectedAsset.status}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="work-title">Trabajo a realizar *</Label>
            <Input id="work-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Cambiar filtros y revisar sistema hidráulico" maxLength={160} />
            <p className="text-xs text-muted-foreground">Usa una descripción breve que permita identificar la orden rápidamente.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción y alcance</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Condición observada, diagnóstico inicial y alcance esperado" rows={4} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="requested-materials">Materiales / insumos solicitados</Label>
            <Textarea id="requested-materials" value={requestedMaterials} onChange={(event) => setRequestedMaterials(event.target.value)} placeholder="Ej. Filtro de aceite, filtro de combustible y aceite según vale de consumo" rows={3} />
            <p className="text-xs text-muted-foreground">Queda registrado como evidencia de la OT. Durante la puesta en marcha, la falta de stock no bloquea el trabajo.</p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de trabajo *</Label>
            <Select value={workType} onValueChange={setWorkType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Correctivo</SelectItem><SelectItem value="preventive">Preventivo</SelectItem><SelectItem value="predictive">Predictivo</SelectItem><SelectItem value="inspection">Inspección</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridad *</Label>
            <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Planificación inicial</CardTitle>
          <CardDescription>La asignación y las estimaciones pueden ajustarse después.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="scheduled-date">Fecha programada *</Label><Input id="scheduled-date" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="planned-hours">Horas estimadas</Label><Input id="planned-hours" type="number" min="0" step="0.5" value={plannedHours} onChange={(event) => setPlannedHours(event.target.value)} placeholder="Ej. 4" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="assigned-to">Responsable o cuadrilla</Label><Input id="assigned-to" value={assignedToName} onChange={(event) => setAssignedToName(event.target.value)} placeholder="Puede asignarse después" /></div>
          <div className="space-y-2"><Label htmlFor="meter-reading">Lectura inicial</Label><Input id="meter-reading" type="number" min="0" step="0.1" value={meterReading} onChange={(event) => setMeterReading(event.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-2"><Label>Unidad de lectura</Label><Select value={meterUnit} onValueChange={setMeterUnit} disabled={!meterReading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hours">Horas</SelectItem><SelectItem value="km">Kilómetros</SelectItem><SelectItem value="cycles">Ciclos</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo">Cancelar</Link></Button>
        <Button onClick={submit} disabled={submitting || isLoading || Boolean(error) || reviewLoading || Boolean(reviewError) || Boolean(review?.linked_work_order_id)}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {submitting ? 'Creando orden…' : reviewId ? 'Crear OT y resolver revisión' : 'Crear orden'}
        </Button>
      </div>
    </div>
  );
}
