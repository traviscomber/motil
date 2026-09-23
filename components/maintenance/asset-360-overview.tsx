'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  FileText,
  Gauge,
  Hash,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { getEquipmentImageMeta } from '@/lib/maintenance/equipment-images';

type Asset360Response = {
  asset?: {
    id: string;
    asset_code?: string | null;
    name?: string | null;
    asset_type?: string | null;
    category?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    serial_number?: string | null;
    license_plate?: string | null;
    cost_center_code?: string | null;
    location?: string | null;
    criticality?: string | null;
    operational_status?: string | null;
    is_active?: boolean | null;
    validation_status?: string | null;
  };
  summary?: {
    activeWorkOrders: number;
    criticalOpen: number;
    operationalBlockers: number;
    readyToClose: number;
    pendingPlanSteps: number;
    overduePreventives: number;
  };
  runtime?: {
    reading_count?: number;
    last_reading_at?: string | null;
    latest_meter_hours?: number | string | null;
    observed_operating_hours?: number | string | null;
    reset_count?: number;
    usable_for_rate_metrics?: boolean;
  } | null;
  reliability?: {
    audited_closures?: number;
    recurring_cause_count?: number;
    max_same_cause_occurrences?: number;
    audited_total_cost?: number | string | null;
    audited_avg_cost?: number | string | null;
    total_downtime_hours?: number | string | null;
    avg_days_between_audited_interventions?: number | string | null;
    has_recurring_root_cause?: boolean;
    last_audited_closure_at?: string | null;
  } | null;
  runtimeReliability?: {
    audited_corrective_events?: number;
    corrective_events_with_meter?: number;
    valid_mtbf_intervals?: number;
    mtbf_operating_hours?: number | string | null;
    mttr_hours?: number | string | null;
    meter_event_coverage_percent?: number | string | null;
  } | null;
  nextPreventive?: {
    schedule_id: string;
    task_name?: string | null;
    frequency_hours?: number | string | null;
    due_meter?: number | string | null;
    effective_current_meter?: number | string | null;
    hour_status?: string | null;
    remaining_hours?: number | string | null;
    alert_due?: boolean;
    generated_work_order_id?: string | null;
  } | null;
  closeReadiness?: Array<{
    work_order_id: string;
    work_order_number?: string | null;
    next_action?: string | null;
    ready_to_close?: boolean;
    standard_plan_steps_pending?: number | string | null;
  }>;
};

type Metric = [label: string, value: string | number, icon: LucideIcon];

const fetcher = async (url: string): Promise<Asset360Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la ficha 360 operacional');
  return payload;
};

const number = (value: unknown, digits = 0) =>
  Number(value).toLocaleString('es-CL', { maximumFractionDigits: digits });

const money = (value: unknown) =>
  value == null ? 'Sin base' : `$${Number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

const show = (value: unknown) => {
  if (value == null || String(value).trim() === '') return 'No informado';
  return String(value);
};

function IdentityItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: unknown;
}) {
  return (
    <div className="min-w-0 border-l border-border/70 pl-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{show(value)}</p>
    </div>
  );
}

export function Asset360Overview({
  assetId,
  scope = 'equipos',
}: {
  assetId: string;
  scope?: 'equipos' | 'vehiculos';
}) {
  const [origin, setOrigin] = useState('https://www.motil.app');
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<Asset360Response>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/operational-360` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const noun = scope === 'vehiculos' ? 'Vehículo' : 'Equipo';
  const basePath = `/dashboard/mantenimiento/${scope}/${encodeURIComponent(assetId)}`;
  const qrTargetUrl = `${origin}${basePath}/ficha`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(qrTargetUrl)}`;

  if (isLoading) {
    return (
      <StatePanel
        tone="loading"
        title={`Preparando ${noun} 360°`}
        description="Reuniendo identidad, OT, preventivos, horómetro, costos auditados y confiabilidad."
      />
    );
  }

  if (error || !data?.asset) {
    return (
      <StatePanel
        tone="error"
        title={`No fue posible preparar ${noun} 360°`}
        description={error instanceof Error ? error.message : 'No se encontró el activo solicitado.'}
        actions={
          <Button variant="outline" onClick={() => void mutate()}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        }
      />
    );
  }

  const asset = data.asset;
  const summary = data.summary || {
    activeWorkOrders: 0,
    criticalOpen: 0,
    operationalBlockers: 0,
    readyToClose: 0,
    pendingPlanSteps: 0,
    overduePreventives: 0,
  };
  const runtime = data.runtime;
  const reliability = data.reliability;
  const rr = data.runtimeReliability;
  const nextPreventive = data.nextPreventive;
  const actionableWorkOrder =
    data.closeReadiness?.find((row) => row.work_order_id && !row.ready_to_close) ||
    data.closeReadiness?.find((row) => row.work_order_id) ||
    null;

  const mtbf =
    Number(rr?.valid_mtbf_intervals || 0) > 0 && rr?.mtbf_operating_hours != null
      ? `${number(rr.mtbf_operating_hours, 1)} h`
      : 'Sin base';
  const mttr =
    Number(rr?.audited_corrective_events || 0) > 0 && rr?.mttr_hours != null
      ? `${number(rr.mttr_hours, 1)} h`
      : 'Sin base';
  const auditedCost =
    Number(reliability?.audited_closures || 0) > 0
      ? money(reliability?.audited_total_cost)
      : 'Sin base';

  const metrics: Metric[] = [
    ['OT activas', summary.activeWorkOrders, Wrench],
    ['Preventivos vencidos', summary.overduePreventives, AlertTriangle],
    ['Bloqueos operativos', summary.operationalBlockers, Activity],
    [
      'Horómetro',
      runtime?.latest_meter_hours != null
        ? `${number(runtime.latest_meter_hours, 1)} h`
        : 'Sin lectura',
      Gauge,
    ],
    ['MTBF real', mtbf, Timer],
    ['Costo auditado', auditedCost, Activity],
  ];

  const links = [
    { href: `${basePath}/documentos`, label: 'Documentos', icon: FileText },
    { href: `${basePath}/ficha-tecnica`, label: 'Ficha técnica', icon: Gauge },
    { href: `${basePath}/qr`, label: 'QR', icon: QrCode },
  ];

  const technicalIdentity = [
    asset.manufacturer,
    asset.model,
    asset.asset_type || asset.category,
  ]
    .filter(Boolean)
    .join(' · ');
  const equipmentImage =
    getEquipmentImageMeta(`${asset.manufacturer || ''} ${asset.model || ''} ${asset.name || ''}`) ||
    getEquipmentImageMeta(`${asset.name || ''} ${asset.asset_type || ''} ${asset.category || ''}`);

  const imageFailed = Boolean(equipmentImage?.image && failedImageSrc === equipmentImage.image);

  const criticalityLabel: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    media: 'Media',
    medium: 'Media',
    low: 'Baja',
    alta: 'Alta',
    baja: 'Baja',
  };
  const statusLabel: Record<string, string> = {
    active: 'Operativo',
    maintenance: 'En mantención',
    inactive: 'Inactivo',
    out_of_service: 'Fuera de servicio',
  };
  const displayCriticality = asset.criticality
    ? criticalityLabel[String(asset.criticality).toLowerCase()] || asset.criticality
    : null;
  const displayStatus = asset.operational_status
    ? statusLabel[String(asset.operational_status).toLowerCase()] || asset.operational_status
    : null;

  const attention = summary.criticalOpen > 0
    ? { tone: 'border-destructive/40 bg-destructive/5', title: 'OT crítica abierta', detail: 'Revisar la orden crítica y su siguiente acción.' }
    : summary.overduePreventives > 0
      ? { tone: 'border-amber-500/40 bg-amber-500/5', title: 'Preventivo vencido', detail: 'Existe mantenimiento preventivo que requiere atención.' }
      : summary.operationalBlockers > 0
        ? { tone: 'border-amber-500/40 bg-amber-500/5', title: 'Bloqueo operativo', detail: 'Existe una dependencia que impide avanzar o cerrar trabajo.' }
        : summary.pendingPlanSteps > 0
          ? { tone: 'border-border bg-muted/20', title: 'Trabajo pendiente', detail: 'Quedan pasos de ejecución antes del cierre.' }
          : { tone: 'border-border bg-muted/10', title: 'Sin alertas operacionales', detail: 'No hay excepciones abiertas en la evidencia disponible.' };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[minmax(230px,0.75fr)_minmax(0,2fr)_220px]">
            <div className="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-r">
              <div className="overflow-hidden rounded-md border border-border/70 bg-background">
                {equipmentImage && !imageFailed ? (
                  <img
                    src={equipmentImage.image}
                    alt={`Imagen referencial de ${asset.name || 'equipo'}`}
                    className="h-48 w-full object-cover"
                    onError={() => setFailedImageSrc(equipmentImage.image)}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center px-5 text-center text-xs text-muted-foreground">
                    Imagen no disponible. La ficha sigue operativa.
                  </div>
                )}
              </div>
              {equipmentImage && !imageFailed ? (
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{equipmentImage.match === 'model' ? 'Referencia de modelo' : 'Referencia de familia'}</span>
                  {equipmentImage.sourceUrl ? (
                    <a
                      href={equipmentImage.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground hover:underline"
                    >
                      {equipmentImage.sourceDomain || 'Fuente'}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 p-5 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Ficha 360 · activo canónico
                  </p>
                  <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {asset.name || asset.asset_code || noun}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {asset.asset_code || 'Código no informado'}
                    </span>
                    <Badge variant={asset.is_active ? 'outline' : 'secondary'}>
                      {asset.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {displayStatus ? (
                      <Badge variant="outline">{displayStatus}</Badge>
                    ) : null}
                    {displayCriticality ? (
                      <Badge variant={String(asset.criticality).toLowerCase().includes('crit') ? 'destructive' : 'secondary'}>
                        {displayCriticality}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {technicalIdentity || 'Clasificación técnica no informada'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {links.map(({ href, label, icon: Icon }) => (
                    <Button key={href} asChild variant="outline" size="sm">
                      <Link href={href}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <IdentityItem icon={Hash} label="Código" value={asset.asset_code} />
                <IdentityItem icon={Building2} label="Centro de costo" value={asset.cost_center_code} />
                <IdentityItem icon={MapPin} label="Ubicación" value={asset.location} />
                <IdentityItem
                  icon={ShieldCheck}
                  label={scope === 'vehiculos' ? 'Patente / serie' : 'N° de serie'}
                  value={scope === 'vehiculos' ? asset.license_plate || asset.serial_number : asset.serial_number}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-t border-border bg-muted/10 p-5 lg:border-l lg:border-t-0">
              <Link href={`${basePath}/qr`} className="group">
                <div className="rounded-lg border bg-white p-3">
                  <img
                    src={qrImageUrl}
                    alt={`QR de ${asset.asset_code || asset.name || 'activo'}`}
                    className="h-32 w-32 object-contain"
                  />
                </div>
              </Link>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                Identidad QR
              </p>
              <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground">
                Escanea para abrir esta ficha 360 en terreno.
              </p>
            </div>
          </div>

          <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-6">
            {metrics.map(([label, value, Icon]) => (
              <div key={label} className="bg-card p-4">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="text-xs">{label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-lg font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={`shadow-none ${attention.tone}`}>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Qué requiere atención</p>
            <p className="mt-1 text-lg font-semibold">{attention.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{attention.detail}</p>
          </div>
          {actionableWorkOrder ? (
            <Button asChild size="sm">
              <Link href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(actionableWorkOrder.work_order_id)}`}>
                Continuar trabajo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <details className="group rounded-lg border border-border bg-card" open>
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
          Operación, mantenimiento y confiabilidad
        </summary>
        <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Próximo preventivo por horas
            </p>
            {nextPreventive ? (
              <>
                <p className="mt-3 font-medium">{nextPreventive.task_name || 'Pauta configurada'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actual{' '}
                  {nextPreventive.effective_current_meter == null
                    ? 'sin lectura'
                    : `${number(nextPreventive.effective_current_meter, 1)} h`}{' '}
                  · vence{' '}
                  {nextPreventive.due_meter == null
                    ? 'sin base'
                    : `${number(nextPreventive.due_meter, 1)} h`}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={nextPreventive.alert_due ? 'destructive' : 'outline'}>
                    {nextPreventive.alert_due ? 'Vencido' : nextPreventive.hour_status || 'Pendiente'}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/mantenimiento/preventivo-horas">
                      Abrir pauta
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No hay pauta horaria configurada para este activo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Confiabilidad auditada
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">MTTR</p>
                <p className="mt-1 font-medium">{mttr}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cobertura horómetro</p>
                <p className="mt-1 font-medium">
                  {Number(rr?.audited_corrective_events || 0) > 0 &&
                  rr?.meter_event_coverage_percent != null
                    ? `${number(rr.meter_event_coverage_percent, 0)}%`
                    : 'Sin base'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cierres auditados</p>
                <p className="mt-1 font-medium">{Number(reliability?.audited_closures || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Causas recurrentes</p>
                <p className="mt-1 font-medium">{Number(reliability?.recurring_cause_count || 0)}</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
              <Link href="/dashboard/mantenimiento/confiabilidad">
                Ver confiabilidad
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Cierre y ejecución
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Pasos pendientes</p>
                <p className="mt-1 font-medium">{summary.pendingPlanSteps}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Listas para cerrar</p>
                <p className="mt-1 font-medium">{summary.readyToClose}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Críticas abiertas</p>
                <p className="mt-1 font-medium">{summary.criticalOpen}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reinicios horómetro</p>
                <p className="mt-1 font-medium">
                  {runtime ? Number(runtime.reset_count || 0) : 'Sin lectura'}
                </p>
              </div>
            </div>
            {actionableWorkOrder ? (
              <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
                <Link
                  href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(
                    actionableWorkOrder.work_order_id,
                  )}`}
                >
                  Continuar trabajo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                No hay una OT activa con cierre pendiente para continuar.
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
          Trazabilidad y criterio de evidencia
        </summary>
        <div className="border-t border-border px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Horómetro, MTBF y MTTR se muestran sólo desde evidencia operacional auditada. El costo se obtiene desde snapshots de cierre auditado. Los campos de identidad ausentes permanecen explícitamente como no informados.
          </p>
        </div>
      </details>
    </div>
  );
}
