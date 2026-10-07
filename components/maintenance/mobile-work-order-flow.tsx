'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Camera, CirclePause, CirclePlay, Clock3, ShieldCheck, SquareStop, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { formatWorkOrderNumber } from '@/lib/maintenance/work-order-display';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

type EvidenceTag = 'before' | 'during' | 'completed' | 'general';

type EvidenceResponse = {
  evidence?: Array<{
    id: string;
    evidence_tag?: EvidenceTag | null;
    file_name: string;
    created_at: string;
    signed_url?: string | null;
  }>;
};

type TimerResponse = {
  current?: {
    timer_status?: 'idle' | 'running' | 'paused';
    timer_start_time?: string | null;
    total_seconds?: number;
    total_minutes?: number;
  };
  timeline?: Array<{
    event_type?: string;
    payload?: { notes?: string | null } | null;
  }>;
};

const PAUSE_REASONS = [
  'Entró una OT más crítica',
  'Falta de repuesto o material',
  'Espera de autorización o coordinación',
  'Equipo o área no disponible',
  'Condición de seguridad',
  'Cambio de prioridad operacional',
  'Otro',
] as const;

const evidenceTagLabels: Record<EvidenceTag, string> = {
  before: 'Antes / daño',
  during: 'Durante trabajo',
  completed: 'Trabajo terminado',
  general: 'General',
};

const fetcher = async (url: string): Promise<TimerResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el estado del trabajo.');
  return payload as TimerResponse;
};

const evidenceFetcher = async (url: string): Promise<EvidenceResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la evidencia.');
  return payload as EvidenceResponse;
};

function duration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function MobileWorkOrderFlow({
  workOrderId,
  workOrderNumber,
  title,
  assetName,
  description,
  status,
  assignedPersonId,
  canEdit,
  onWorkOrderChange,
}: {
  workOrderId: string;
  workOrderNumber?: string | null;
  title?: string | null;
  assetName?: string | null;
  description?: string | null;
  status?: string | null;
  assignedPersonId?: string | null;
  canEdit: boolean;
  onWorkOrderChange: () => Promise<unknown> | void;
}) {
  const router = useRouter();
  const hasCanonicalAssignee = Boolean(assignedPersonId);
  const { data, error, isLoading, mutate } = useSWR<TimerResponse>(
    canEdit && hasCanonicalAssignee && status !== 'completed' ? `/api/maintenance/work-orders/${workOrderId}/timer` : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );
  const { data: evidenceData, mutate: mutateEvidence } = useSWR<EvidenceResponse>(
    canEdit && hasCanonicalAssignee ? `/api/maintenance/work-orders/${workOrderId}/evidence` : null,
    evidenceFetcher,
    { revalidateOnFocus: true },
  );
  const photos = evidenceData?.evidence || [];
  const [evidenceTag, setEvidenceTag] = useState<EvidenceTag>(status === 'in_progress' ? 'during' : 'before');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPauseForm, setShowPauseForm] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseDetail, setPauseDetail] = useState('');
  const timerStatus = data?.current?.timer_status || 'idle';
  const baseSeconds = Number(data?.current?.total_seconds ?? (Number(data?.current?.total_minutes || 0) * 60));
  const timerStartTime = data?.current?.timer_start_time || null;
  const lastPauseReason = timerStatus === 'paused'
    ? data?.timeline?.find((event) => event.event_type === 'timer_pause')?.payload?.notes || null
    : null;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (timerStatus !== 'running' || !timerStartTime) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerStatus, timerStartTime]);

  const runningSeconds = timerStatus === 'running' && timerStartTime
    ? Math.max(0, Math.floor((nowMs - new Date(timerStartTime).getTime()) / 1000))
    : 0;
  const displaySeconds = baseSeconds + runningSeconds;

  async function request(url: string, options: RequestInit) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar el cambio.');
  }

  async function uploadEvidence(files: FileList | null) {
    if (!files?.length) return;
    setUploadingEvidence(true);
    setMessage(null);
    try {
      const supabase = createSupabaseClient();
      for (const file of Array.from(files)) {
        const prepareResponse = await fetch(`/api/maintenance/work-orders/${workOrderId}/evidence`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_upload',
            fileName: file.name || 'foto.jpg',
            mimeType: file.type || '',
            sizeBytes: file.size,
          }),
        });
        const prepared = await prepareResponse.json().catch(() => null);
        if (!prepareResponse.ok) throw new Error(prepared?.error || 'No se pudo preparar la foto.');

        const upload = prepared?.upload;
        if (!upload?.storagePath || !upload?.token || !upload?.evidenceId) {
          throw new Error('No se pudo preparar la subida de la foto.');
        }

        const { error: uploadError } = await supabase.storage
          .from('maintenance-work-order-evidence')
          .uploadToSignedUrl(upload.storagePath, upload.token, file, {
            contentType: upload.mimeType || file.type || 'image/jpeg',
            cacheControl: '3600',
          });
        if (uploadError) throw new Error(uploadError.message || 'No se pudo subir la foto.');

        const completeResponse = await fetch(`/api/maintenance/work-orders/${workOrderId}/evidence`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete_upload',
            evidenceId: upload.evidenceId,
            storagePath: upload.storagePath,
            fileName: upload.fileName || file.name || 'foto.jpg',
            mimeType: upload.mimeType || file.type || '',
            sizeBytes: upload.sizeBytes || file.size,
            evidenceTag,
          }),
        });
        const completed = await completeResponse.json().catch(() => null);
        if (!completeResponse.ok) throw new Error(completed?.error || 'La foto subió, pero no se pudo registrar.');
      }
      await mutateEvidence();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo guardar la evidencia.');
    } finally {
      setUploadingEvidence(false);
    }
  }

  async function startWork() {
    if (!hasCanonicalAssignee) return;
    setBusy(true);
    setMessage(null);
    try {
      await request(`/api/maintenance/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      if (timerStatus === 'idle') {
        await request(`/api/maintenance/work-orders/${workOrderId}/timer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'play' }),
        });
      }
      await Promise.all([onWorkOrderChange(), mutate()]);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo iniciar el trabajo.');
    } finally {
      setBusy(false);
    }
  }

  async function timerAction(action: 'play' | 'pause' | 'resume', notes?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await request(`/api/maintenance/work-orders/${workOrderId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || null }),
      });
      await mutate();
      if (action === 'pause') {
        setShowPauseForm(false);
        setPauseReason('');
        setPauseDetail('');
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo actualizar el tiempo.');
    } finally {
      setBusy(false);
    }
  }

  async function pauseWork() {
    if (!pauseReason) {
      setMessage('Selecciona el motivo de la pausa.');
      return;
    }
    if (pauseReason === 'Otro' && !pauseDetail.trim()) {
      setMessage('Describe el motivo de la pausa.');
      return;
    }
    const notes = pauseDetail.trim() ? `${pauseReason} — ${pauseDetail.trim()}` : pauseReason;
    await timerAction('pause', notes);
  }

  async function finishWork() {
    setBusy(true);
    setMessage(null);
    try {
      if (timerStatus === 'running' || timerStatus === 'paused') {
        await request(`/api/maintenance/work-orders/${workOrderId}/timer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'terminate' }),
        });
      }
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(workOrderId)}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo preparar el cierre.');
      setBusy(false);
    }
  }

  if (!canEdit) return <StatePanel tone="neutral" title="Orden de solo lectura" description="Este registro no admite ejecución desde terreno." />;
  if (status === 'completed') return <StatePanel tone="neutral" title="Trabajo terminado" description="La OT ya fue cerrada y permanece disponible como trazabilidad." />;
  if (!hasCanonicalAssignee) return <StatePanel tone="warning" title="Falta asignar responsable" description="Esta OT aún no está vinculada a una persona operativa. Pide a tu jefatura o planificación que asigne el responsable antes de iniciar." />;
  if (isLoading) return <StatePanel tone="loading" title="Cargando trabajo" />;
  if (error) return <StatePanel tone="error" title="No se pudo cargar el trabajo" description={error.message} />;

  return (
    <section className="mx-auto w-full max-w-xl space-y-4" aria-label="Ejecución en terreno">
      <Card className="border-2 shadow-none">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-muted-foreground">{formatWorkOrderNumber(workOrderNumber, 'es')}</p>
              <Badge variant={timerStatus === 'running' ? 'default' : 'outline'}>
                {timerStatus === 'running'
                  ? 'En curso'
                  : timerStatus === 'paused'
                    ? 'Pausada'
                    : status === 'in_progress'
                      ? 'Lista para continuar'
                      : 'Pendiente'}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">{title || 'Trabajo asignado'}</h1>
          </div>

          <div className="space-y-3 border-y py-4">
            <div className="flex gap-3">
              <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Equipo</p>
                <p className="font-medium">{assetName || 'Equipo no informado'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qué hacer</p>
              <p className="mt-1 text-sm leading-6">{description || 'Sigue la instrucción de la orden y registra evidencia al terminar.'}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Fotos de la OT</p>
                <p className="text-xs text-muted-foreground">Puedes agregar todas las fotos necesarias.</p>
              </div>
              <Badge variant="outline">{photos.length} foto{photos.length === 1 ? '' : 's'}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select
                aria-label="Tag de evidencia"
                value={evidenceTag}
                onChange={(event) => setEvidenceTag(event.target.value as EvidenceTag)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="before">{evidenceTagLabels.before}</option>
                <option value="during">{evidenceTagLabels.during}</option>
                <option value="completed">{evidenceTagLabels.completed}</option>
              </select>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
                <Camera className="mr-2 h-4 w-4" />
                {uploadingEvidence ? 'Subiendo...' : 'Agregar fotos'}
                <input
                  className="sr-only"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  capture="environment"
                  disabled={uploadingEvidence}
                  onChange={(event) => void uploadEvidence(event.target.files)}
                />
              </label>
            </div>
            {photos.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo) => (
                  <a key={photo.id} href={photo.signed_url || '#'} target="_blank" rel="noreferrer" className="w-20 shrink-0">
                    <div className="h-16 overflow-hidden rounded-md border bg-muted">
                      {photo.signed_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.signed_url} alt={photo.file_name || 'Evidencia de OT'} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {evidenceTagLabels[(photo.evidence_tag || 'general') as EvidenceTag]}
                    </p>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tiempo registrado</p>
              <p className="font-mono text-4xl font-semibold tabular-nums">{duration(displaySeconds)}</p>
            </div>
          </div>

          {status !== 'in_progress' ? (
            <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void startWork()}>
              <CirclePlay className="mr-2 h-5 w-5" />
              {busy ? 'Iniciando...' : 'Iniciar trabajo'}
            </Button>
          ) : timerStatus === 'idle' ? (
            <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void timerAction('play')}>
              <CirclePlay className="mr-2 h-5 w-5" />
              {busy ? 'Iniciando...' : 'Reanudar trabajo'}
            </Button>
          ) : timerStatus === 'running' && !showPauseForm ? (
            <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => { setMessage(null); setShowPauseForm(true); }}>
              <CirclePause className="mr-2 h-5 w-5" />
              Pausar trabajo
            </Button>
          ) : timerStatus === 'running' && showPauseForm ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <label htmlFor="pause-reason" className="text-sm font-medium">Motivo de pausa</label>
              <select
                id="pause-reason"
                value={pauseReason}
                onChange={(event) => setPauseReason(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un motivo</option>
                {PAUSE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
              <textarea
                id="pause-detail"
                aria-label="Comentario de la pausa"
                value={pauseDetail}
                onChange={(event) => setPauseDetail(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder={pauseReason === 'Otro' ? 'Describe el motivo' : 'Comentario opcional'}
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="ghost" className="h-11" disabled={busy} onClick={() => { setShowPauseForm(false); setMessage(null); }}>
                  Cancelar
                </Button>
                <Button className="h-11" disabled={busy || !pauseReason} onClick={() => void pauseWork()}>
                  <CirclePause className="mr-2 h-4 w-4" />
                  {busy ? 'Pausando...' : 'Confirmar pausa'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {lastPauseReason ? (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Motivo de la pausa</p>
                  <p className="mt-1 text-sm font-medium">{lastPauseReason}</p>
                </div>
              ) : null}
              <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void timerAction('resume')}>
                <CirclePlay className="mr-2 h-5 w-5" />
                {busy ? 'Guardando...' : 'Reanudar trabajo'}
              </Button>
            </div>
          )}

          {status === 'in_progress' ? (
            <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={busy} onClick={() => void finishWork()}>
              <SquareStop className="mr-2 h-5 w-5" />
              Terminar y registrar evidencia
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <p className="flex gap-2 px-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        El cierre requiere causa, acción preventiva, horas reales y evidencia de horómetro cuando corresponda.
      </p>
      {message ? <StatePanel tone="error" title="No se pudo guardar" description={message} /> : null}
    </section>
  );
}
