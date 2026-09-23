'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  Coins,
  Database,
  FileText,
  Gauge,
  Hash,
  MapPin,
  PackageCheck,
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
  generatedAt?: string | null;
  unavailableSources?: string[];
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
    meter_unit?: string | null;
    mobility_class?: string | null;
    lifecycle_state?: string | null;
    lifecycle_reason?: string | null;
    acquisition_date?: string | null;
    acquisition_cost?: number | string | null;
    expected_lifespan_years?: number | string | null;
    baseline_mtbf_hours?: number | string | null;
    source_file?: string | null;
    source_sheet?: string | null;
    source_row?: number | null;
    imported_at?: string | null;
    updated_at?: string | null;
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
  recentEvents?: Array<{
    id: string;
    work_order_id?: string | null;
    event_type?: string | null;
    event_at?: string | null;
    actor_name?: string | null;
    summary?: string | null;
  }>;
  auditedInterventions?: Array<{
    id: string;
    work_order_id: string;
    closure_sequence?: number | null;
    parts_cost?: number | string | null;
    labor_cost?: number | string | null;
    effective_external_cost?: number | string | null;
    total_cost?: number | string | null;
    closed_at?: string | null;
    workOrder?: {
      id: string;
      work_order_number?: string | null;
      title?: string | null;
      status?: string | null;
      priority?: string | null;
      work_type?: string | null;
      scheduled_date?: string | null;
      start_date?: string | null;
      completion_date?: string | null;
      root_cause?: string | null;
      preventive_actions?: string | null;
      actual_duration_hours?: number | string | null;
    } | null;
  }>;
  installedParts?: Array<{
    id: string;
    quantity_requested?: number | null;
    quantity_issued?: number | null;
    quantity_installed?: number | null;
    quantity_returned?: number | null;
    unit_cost?: number | string | null;
    total_cost?: number | string | null;
    status?: string | null;
    installed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    notes?: string | null;
    product?: {
      id: string;
      product_code?: string | null;
      name?: string | null;
      unit?: string | null;
    } | null;
    workOrder?: {
      id: string;
      work_order_number?: string | null;
      title?: string | null;
    } | null;
  }>;
  pendingParts?: Array<{
    id: string;
    quantity_requested?: number | null;
    quantity_issued?: number | null;
    quantity_installed?: number | null;
    quantity_returned?: number | null;
    unit_cost?: number | string | null;
    total_cost?: number | string | null;
    status?: string | null;
    installed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    notes?: string | null;
    product?: {
      id: string;
      product_code?: string | null;
      name?: string | null;
      unit?: string | null;
    } | null;
    workOrder?: {
      id: string;
      work_order_number?: string | null;
      title?: string | null;
    } | null;
  }>;
  economicHistory?: Array<{
    fiscal_year?: number | null;
    movement_count?: number | string | null;
    historical_total_cost?: number | string | null;
    first_cost_date?: string | null;
    last_cost_date?: string | null;
  }>;
  drillEconomics?: {
    window_start?: string | null;
    window_end?: string | null;
    last_cost_date?: string | null;
    last_drilling_date?: string | null;
    recognized_cost_events_90d?: number | string | null;
    recognized_cost_clp_90d?: number | string | null;
    drilling_reports_90d?: number | string | null;
    drilled_meters_90d?: number | string | null;
    cost_clp_per_meter_90d?: number | string | null;
    evidence_status?: string | null;
  } | null;
  drillingMaintenanceReview?: Array<{
    source_report_id: string;
    operation_date?: string | null;
    review_reason?: string | null;
    equipment_status_raw?: string | null;
    machine_observations?: string | null;
    review_status?: string | null;
    linked_work_order_id?: string | null;
    decision_note?: string | null;
    reviewed_at?: string | null;
    has_linked_work_order?: boolean | null;
    policy?: string | null;
  }>;
  drillingHistory?: Array<{
    id: string;
    operation_date?: string | null;
    hole_code_raw?: string | null;
    rig_name_raw?: string | null;
    site_raw?: string | null;
    shift_code_raw?: string | null;
    operator_name_raw?: string | null;
    drilled_meters?: number | string | null;
    machine_observations?: string | null;
    drilling_observations?: string | null;
    equipment_status_raw?: string | null;
    mine_raw?: string | null;
    sector_raw?: string | null;
  }>;
  maintenanceTaskCandidates?: Array<{
    rig_name?: string | null;
    component_key?: string | null;
    suggested_task?: string | null;
    observation_count?: number | string | null;
    out_of_service_count?: number | string | null;
    first_observed_at?: string | null;
    last_observed_at?: string | null;
    latest_status?: string | null;
    latest_observation?: string | null;
    signal_status?: string | null;
    evidence_class?: string | null;
  }>;
  standardJobPlans?: Array<{
    id: string;
    plan_code?: string | null;
    name?: string | null;
    work_type?: string | null;
    status?: string | null;
    estimated_duration_hours?: number | string | null;
    labor_people_required?: number | string | null;
    skill_requirement?: string | null;
    safety_controls?: string | null;
    required_document_reference?: string | null;
    reason?: string | null;
    evidence_reference?: string | null;
    approved_at?: string | null;
  }>;
  runtimeCostIntelligence?: {
    reading_count?: number | string | null;
    first_reading_at?: string | null;
    last_reading_at?: string | null;
    latest_meter_hours?: number | string | null;
    observed_operating_hours?: number | string | null;
    reset_count?: number | string | null;
    usable_for_rate_metrics?: boolean | null;
    audited_closures?: number | string | null;
    audited_total_cost?: number | string | null;
    audited_cost_per_operating_hour?: number | string | null;
  } | null;
  meterHistory?: Array<{
    id: string;
    recorded_at?: string | null;
    meter_value?: number | string | null;
    meter_unit?: string | null;
    source_kind?: string | null;
    source_reference?: string | null;
  }>;
  drillOperationalEvidence?: {
    window_start?: string | null;
    window_end?: string | null;
    drilling_reports?: number | string | null;
    out_of_service_reports?: number | string | null;
    operational_with_observations_reports?: number | string | null;
    operational_reports?: number | string | null;
    invalid_status_reports?: number | string | null;
    equipment_without_crew_reports?: number | string | null;
    power_outage_reports?: number | string | null;
    water_shortage_reports?: number | string | null;
    install_disassembly_reports?: number | string | null;
    scaling_reports?: number | string | null;
    work_order_count?: number | string | null;
    open_work_order_count?: number | string | null;
    recorded_downtime_hours?: number | string | null;
    external_cost_clp?: number | string | null;
    part_line_count?: number | string | null;
    quantity_installed?: number | string | null;
    installed_parts_cost_clp?: number | string | null;
    availability_days?: number | string | null;
    scheduled_minutes?: number | string | null;
    availability_downtime_minutes?: number | string | null;
    evidence_status?: string | null;
  } | null;
  drillEconomicsChange?: {
    current_month?: string | null;
    previous_month?: string | null;
    current_cost_clp_per_meter?: number | string | null;
    previous_cost_clp_per_meter?: number | string | null;
    current_cost_clp?: number | string | null;
    previous_cost_clp?: number | string | null;
    current_drilled_meters?: number | string | null;
    previous_drilled_meters?: number | string | null;
    cost_per_meter_change_pct?: number | string | null;
    drilled_meters_change_pct?: number | string | null;
    recognized_cost_change_pct?: number | string | null;
    interpretation_policy?: string | null;
  } | null;
  maintenancePriority?: {
    meter_unit?: string | null;
    interval_mp?: number | string | null;
    last_mp?: number | string | null;
    next_due_meter?: number | string | null;
    current_reading_at?: string | null;
    current_reading?: number | string | null;
    remaining_meter?: number | string | null;
    interval_consumed?: number | string | null;
    utilization_per_day?: number | string | null;
    projected_days?: number | string | null;
    projected_due_at?: string | null;
    criticality_raw?: string | null;
    criticality_score?: number | string | null;
    urgency_score?: number | string | null;
    total_score?: number | string | null;
    priority?: string | null;
    recommended_action?: string | null;
    scheduled_date?: string | null;
    programming_status_raw?: string | null;
    responsible_raw?: string | null;
    parts_status_raw?: string | null;
    observations?: string | null;
    match_method?: string | null;
    match_score?: number | string | null;
  } | null;
  financeReconciliation?: {
    finance_asset_id?: string | null;
    finance_asset_code?: string | null;
    finance_asset_name?: string | null;
    candidate_count?: number | string | null;
    reconciliation_status?: string | null;
    match_method?: string | null;
  } | null;
  operationalState?: {
    operational_status?: string | null;
    criticality?: string | null;
    location?: string | null;
    recognized_cost_event_count?: number | string | null;
    last_cost_at?: string | null;
    recognized_cost_clp_lifetime?: number | string | null;
    recognized_cost_clp_ytd?: number | string | null;
    recognized_cost_clp_12m?: number | string | null;
    work_order_count?: number | string | null;
    open_work_order_count?: number | string | null;
    recorded_downtime_hours?: number | string | null;
    drilling_report_count?: number | string | null;
    drilled_meters?: number | string | null;
    sensor_count?: number | string | null;
    sensor_reading_count?: number | string | null;
    evidence_domain_count?: number | string | null;
    availability_evidence_status?: string | null;
    availability_pct?: number | string | null;
    last_availability_date?: string | null;
    availability_days_30d?: number | string | null;
    scheduled_minutes_30d?: number | string | null;
    downtime_minutes_30d?: number | string | null;
  } | null;
  supplyChain?: Array<{
    work_order_id: string;
    work_order_number?: string | null;
    title?: string | null;
    work_order_status?: string | null;
    priority?: string | null;
    scheduled_date?: string | null;
    material_requirement_count?: number | string | null;
    material_shortage_count?: number | string | null;
    material_shortage_quantity?: number | string | null;
    supply_need_count?: number | string | null;
    open_supply_need_count?: number | string | null;
    supply_needs_with_request?: number | string | null;
    procurement_request_count?: number | string | null;
    open_procurement_request_count?: number | string | null;
    promoted_procurement_request_count?: number | string | null;
    procurement_order_count?: number | string | null;
    undelivered_order_count?: number | string | null;
    delivered_order_count?: number | string | null;
    procurement_order_amount?: number | string | null;
    part_line_count?: number | string | null;
    parts_requested?: number | string | null;
    parts_issued?: number | string | null;
    parts_installed?: number | string | null;
    parts_cost?: number | string | null;
    stock_movement_count?: number | string | null;
    stock_movement_cost?: number | string | null;
    supply_chain_status?: string | null;
  }>;
  purchaseHistorySummary?: {
    purchaseLines?: number;
    orders?: number;
    suppliers?: number;
    netSpend?: number | string | null;
    lastOrderDate?: string | null;
    lastSupplier?: string | null;
    matchBasis?: 'cost_center' | 'name_model' | string | null;
  };
  costCenterPurchaseHistory?: Array<{
    id: number;
    order_number?: string | null;
    line_number?: number | null;
    product_code?: string | null;
    description?: string | null;
    quantity?: number | string | null;
    unit?: string | null;
    unit_cost?: number | string | null;
    net_amount?: number | string | null;
    cost_center_code?: string | null;
    asset_reference?: string | null;
    supplier_name?: string | null;
    order_date?: string | null;
    status?: string | null;
  }>;
  procurementOrders?: Array<{
    id: string;
    order_number?: string | null;
    supplier_id?: string | null;
    status?: string | null;
    currency?: string | null;
    total_amount?: number | string | null;
    expected_delivery_date?: string | null;
    actual_delivery_date?: string | null;
    issued_at?: string | null;
    updated_at?: string | null;
    work_order_id?: string | null;
    supplier?: {
      id: string;
      legal_name?: string | null;
      trade_name?: string | null;
      payment_terms?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    supplierScore?: {
      supplier_id?: string | null;
      supplier_name?: string | null;
      total_orders?: number | string | null;
      completed_orders?: number | string | null;
      on_time_orders?: number | string | null;
      last_delivery_date?: string | null;
      receipt_count?: number | string | null;
      quantity_received?: number | string | null;
      quantity_accepted?: number | string | null;
      quantity_rejected?: number | string | null;
      returns_count?: number | string | null;
      delivery_score?: number | string | null;
      quality_score?: number | string | null;
      invoice_score?: number | string | null;
      operational_score?: number | string | null;
      evidence_dimensions?: number | string | null;
    } | null;
  }>;
  maintenancePlanning?: Array<{
    id: string;
    source_row?: number | null;
    mine_raw?: string | null;
    asset_name_raw?: string | null;
    meter_unit?: string | null;
    interval_mp?: number | string | null;
    last_mp?: number | string | null;
    initial_reading_at?: string | null;
    initial_reading?: number | string | null;
    current_reading_at?: string | null;
    current_reading?: number | string | null;
    criticality_raw?: string | null;
    scheduled_date?: string | null;
    programming_status_raw?: string | null;
    responsible_raw?: string | null;
    parts_status_raw?: string | null;
    observations?: string | null;
    workbook_priority_raw?: string | null;
    workbook_action_raw?: string | null;
    updated_at?: string | null;
  }>;
  canEdit?: boolean;
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

const date = (value: unknown) => {
  if (!value) return 'No informado';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return show(value);
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(parsed);
};

function IdentityItem({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: LucideIcon;
  label: string;
  value: unknown;
  meta?: string | null;
}) {
  return (
    <div className="min-w-0 border-l border-border/70 pl-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{show(value)}</p>
      {meta ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

function SectionSummary({
  title,
  hint,
}: {
  title: string;
  hint?: string | null;
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {hint ? <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{hint}</p> : null}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        Ver detalle
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
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


  const lifecycleLabel: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    maintenance: 'En mantención',
    retired: 'Retirado',
  };
  const mobilityLabel: Record<string, string> = {
    mobile: 'Móvil',
    fixed: 'Fijo',
    stationary: 'Estacionario',
  };
  const displayLifecycle = asset.lifecycle_state
    ? lifecycleLabel[String(asset.lifecycle_state).toLowerCase()] || asset.lifecycle_state
    : null;
  const displayMobility = asset.mobility_class
    ? mobilityLabel[String(asset.mobility_class).toLowerCase()] || asset.mobility_class
    : null;
  const assetDetails = [
    asset.manufacturer ? ['Fabricante', asset.manufacturer, Building2] as const : null,
    asset.model ? ['Modelo', asset.model, Hash] as const : null,
    asset.license_plate ? ['Patente', asset.license_plate, Hash] as const : null,
    asset.meter_unit ? ['Unidad de control', asset.meter_unit, Gauge] as const : null,
    displayMobility ? ['Movilidad', displayMobility, MapPin] as const : null,
    displayLifecycle ? ['Ciclo de vida', displayLifecycle, Activity] as const : null,
    asset.acquisition_date ? ['Adquisición', date(asset.acquisition_date), CalendarDays] as const : null,
    asset.expected_lifespan_years != null
      ? ['Vida esperada', `${number(asset.expected_lifespan_years, 0)} años`, Timer] as const
      : null,
    asset.acquisition_cost != null
      ? ['Costo adquisición', money(asset.acquisition_cost), Coins] as const
      : null,
    asset.baseline_mtbf_hours != null
      ? ['MTBF base', `${number(asset.baseline_mtbf_hours, 0)} h`, Timer] as const
      : null,
  ].filter(Boolean) as Array<readonly [string, string, LucideIcon]>;
  const recentEvents = data.recentEvents || [];
  const auditedInterventions = data.auditedInterventions || [];
  const installedParts = data.installedParts || [];
  const pendingParts = data.pendingParts || [];
  const maintenancePlanning = data.maintenancePlanning || [];
  const operationalState = data.operationalState;
  const maintenancePriority = data.maintenancePriority;
  const runtimeCostIntelligence = data.runtimeCostIntelligence;
  const maintenanceTaskCandidates = data.maintenanceTaskCandidates || [];
  const standardJobPlans = data.standardJobPlans || [];
  const generatedAt = data.generatedAt;
  const latestPartTimestamp = [...(data.installedParts || []), ...(data.pendingParts || [])]
    .map((row) => row.updated_at || row.installed_at || row.created_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;
  const meterHistory = data.meterHistory || [];
  const drillOperationalEvidence = data.drillOperationalEvidence;
  const drillEconomicsChange = data.drillEconomicsChange;
  const financeReconciliation = data.financeReconciliation;
  const supplyChain = data.supplyChain || [];
  const procurementOrders = data.procurementOrders || [];
  const costCenterPurchaseHistory = data.costCenterPurchaseHistory || [];
  const purchaseHistorySummary = data.purchaseHistorySummary;
  const economicHistory = data.economicHistory || [];
  const drillingHistory = data.drillingHistory || [];
  const drillEconomics = data.drillEconomics;
  const drillingMaintenanceReview = data.drillingMaintenanceReview || [];
  const economicLifetime = economicHistory.reduce(
    (sum, row) => sum + Number(row.historical_total_cost || 0),
    0,
  );
  const drillingMeters = drillingHistory.reduce(
    (sum, row) => sum + Number(row.drilled_meters || 0),
    0,
  );
  const latestPlan = maintenancePlanning[0] || null;
  const acquisitionDate = asset.acquisition_date ? new Date(String(asset.acquisition_date)) : null;
  const assetAgeYears =
    acquisitionDate && !Number.isNaN(acquisitionDate.getTime())
      ? Math.max((Date.now() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000), 0)
      : null;
  const expectedLifespan =
    asset.expected_lifespan_years != null ? Number(asset.expected_lifespan_years) : null;
  const remainingLifeYears =
    assetAgeYears != null && expectedLifespan != null
      ? Math.max(expectedLifespan - assetAgeYears, 0)
      : null;

  const unavailableSources = data.unavailableSources || [];
  const hasPurchaseEvidence = Number(purchaseHistorySummary?.purchaseLines || 0) > 0 || procurementOrders.length > 0;
  const hasMaintenanceEvidence = auditedInterventions.length > 0 || Number(operationalState?.work_order_count || 0) > 0;
  const hasMaterialEvidence = installedParts.length > 0 || pendingParts.length > 0 || supplyChain.length > 0;
  const hasProductionEvidence = drillingHistory.length > 0 || Number(operationalState?.drilling_report_count || 0) > 0;
  const hasRuntimeEvidence = meterHistory.length > 0 || Number(runtimeCostIntelligence?.reading_count || 0) > 0;
  const hasEconomicEvidence = economicHistory.length > 0 || Number(operationalState?.recognized_cost_event_count || 0) > 0;

  const coverageItems = [
    ['Identidad canónica', true, 'Disponible'],
    ['Estado operacional', Boolean(operationalState), operationalState ? 'Disponible' : 'Sin estado consolidado'],
    ['Plan de mantención', Boolean(maintenancePriority || latestPlan), maintenancePriority || latestPlan ? 'Disponible' : 'No registrado'],
    ['Horómetro / uso', hasRuntimeEvidence, hasRuntimeEvidence ? 'Disponible' : 'Sin lecturas históricas'],
    ['Economía / costos', hasEconomicEvidence, hasEconomicEvidence ? 'Disponible' : 'Sin movimientos'],
    ['Compras / proveedores', hasPurchaseEvidence, hasPurchaseEvidence ? 'Disponible' : 'Sin compras enlazadas'],
    ['OT / mantenciones', hasMaintenanceEvidence, hasMaintenanceEvidence ? 'Disponible' : 'Sin OT enlazadas'],
    ['Materiales / repuestos', hasMaterialEvidence, hasMaterialEvidence ? 'Disponible' : 'Sin movimientos enlazados'],
    ['Vida útil', expectedLifespan != null || asset.acquisition_date != null, expectedLifespan != null || asset.acquisition_date != null ? 'Disponible' : 'No informada'],
    ['Producción / actividad', hasProductionEvidence || recentEvents.length > 0, hasProductionEvidence || recentEvents.length > 0 ? 'Disponible' : 'Sin actividad enlazada'],
  ] as const;
  const coverageAvailableCount = coverageItems.filter(([, available]) => available).length;
  const coverageMissingCount = coverageItems.length - coverageAvailableCount;
  const latestMpValue = latestPlan?.last_mp != null ? Number(latestPlan.last_mp) : null;
  const latestMpSummary = latestMpValue != null && Number.isFinite(latestMpValue) && latestMpValue > 0
    ? `Última MP ${number(latestMpValue, 1)} ${latestPlan?.meter_unit || ''}`.trim()
    : 'Última MP no informada';

  const planningPriorityText = String(maintenancePriority?.priority || '');
  const attention = summary.criticalOpen > 0
    ? { tone: 'border-destructive/40 bg-destructive/5', title: 'OT crítica abierta', detail: 'Revisar la orden crítica y su siguiente acción.' }
    : summary.overduePreventives > 0
      ? { tone: 'border-amber-500/40 bg-amber-500/5', title: 'Preventivo vencido', detail: maintenancePriority?.recommended_action || 'Existe mantenimiento preventivo que requiere atención.' }
      : planningPriorityText.startsWith('P1')
        ? { tone: 'border-destructive/40 bg-destructive/5', title: planningPriorityText, detail: maintenancePriority?.recommended_action || 'Intervención prioritaria según planificación.' }
        : planningPriorityText.startsWith('P2')
          ? { tone: 'border-amber-500/40 bg-amber-500/5', title: planningPriorityText, detail: maintenancePriority?.recommended_action || 'Intervención próxima según planificación.' }
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

          {assetDetails.length > 0 ? (
            <div className="border-t border-border px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Datos del activo
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {assetDetails.map(([label, value, Icon]) => (
                  <IdentityItem key={label} icon={Icon} label={label} value={value} />
                ))}
              </div>
            </div>
          ) : null}
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
          {!actionableWorkOrder && maintenancePriority ? (
            <div className="text-right text-xs text-muted-foreground">
              {maintenancePriority.remaining_meter != null ? (
                <p>
                  Margen: {number(maintenancePriority.remaining_meter, 0)} {maintenancePriority.meter_unit || ''}
                </p>
              ) : null}
              {maintenancePriority.projected_due_at ? (
                <p className="mt-1">Proyección: {date(maintenancePriority.projected_due_at)}</p>
              ) : maintenancePriority.scheduled_date ? (
                <p className="mt-1">Programado: {date(maintenancePriority.scheduled_date)}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary
          title="Cobertura de la ficha"
          hint={`${coverageAvailableCount} capas con evidencia · ${coverageMissingCount} sin registro`}
        />
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {coverageItems.map(([label, available, status]) => (
            <div key={label} className="bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{status}</p>
              {!available ? (
                <p className="mt-1 text-[11px] text-muted-foreground">La fuente actual no contiene información enlazada para este activo.</p>
              ) : null}
            </div>
          ))}
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card" open>
        <SectionSummary title="Operación, mantenimiento y confiabilidad" hint={`${summary.activeWorkOrders} OT activas · ${summary.overduePreventives} preventivos vencidos · ${summary.operationalBlockers} bloqueos`} />
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
        <SectionSummary title="Estado económico-operacional" hint={operationalState?.last_cost_at ? `Costo 12m ${money(operationalState.recognized_cost_clp_12m)} · corte ${date(operationalState.last_cost_at)}` : 'Costos, OT y disponibilidad del activo'} />
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <IdentityItem
            icon={Coins}
            label="Costo reconocido vida"
            value={operationalState?.recognized_cost_clp_lifetime != null ? money(operationalState.recognized_cost_clp_lifetime) : null}
            meta={operationalState?.last_cost_at ? `Acumulado hasta ${date(operationalState.last_cost_at)}` : 'Sin fecha de último costo'}
          />
          <IdentityItem
            icon={Coins}
            label="Costo últimos 12 meses"
            value={operationalState?.recognized_cost_clp_12m != null ? money(operationalState.recognized_cost_clp_12m) : null}
            meta={operationalState?.last_cost_at ? `Período móvil a ${date(operationalState.last_cost_at)}` : null}
          />
          <IdentityItem
            icon={Coins}
            label="Costo año"
            value={operationalState?.recognized_cost_clp_ytd != null ? money(operationalState.recognized_cost_clp_ytd) : null}
            meta={operationalState?.last_cost_at ? `Año a ${date(operationalState.last_cost_at)}` : null}
          />
          <IdentityItem
            icon={CalendarDays}
            label="Último costo"
            value={date(operationalState?.last_cost_at)}
          />
          <IdentityItem
            icon={Wrench}
            label="OT históricas"
            value={operationalState?.work_order_count}
            meta={generatedAt ? `Corte de consulta ${date(generatedAt)}` : null}
          />
          <IdentityItem
            icon={Wrench}
            label="OT abiertas"
            value={operationalState?.open_work_order_count}
            meta={generatedAt ? `Estado consultado ${date(generatedAt)}` : null}
          />
          <IdentityItem
            icon={Timer}
            label="Detención registrada"
            value={operationalState?.recorded_downtime_hours != null ? `${number(operationalState.recorded_downtime_hours, 1)} h` : null}
            meta={generatedAt ? `Acumulado al corte ${date(generatedAt)}` : null}
          />
          <IdentityItem
            icon={Activity}
            label="Disponibilidad"
            value={operationalState?.availability_pct != null ? `${number(operationalState.availability_pct, 1)}%` : operationalState?.availability_evidence_status}
            meta={operationalState?.last_availability_date ? `Fecha de corte ${date(operationalState.last_availability_date)}` : operationalState?.availability_days_30d ? 'Período: últimos 30 días' : 'Sin fecha de corte'}
          />
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Compras y proveedores" hint={purchaseHistorySummary?.lastSupplier ? `${purchaseHistorySummary.lastSupplier} · última compra ${date(purchaseHistorySummary.lastOrderDate)}` : 'Sin compras directas o contexto histórico disponible'} />
        <div className="border-t border-border p-4">
          {purchaseHistorySummary && Number(purchaseHistorySummary.purchaseLines || 0) > 0 ? (
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <IdentityItem icon={Building2} label="Último proveedor" value={purchaseHistorySummary.lastSupplier} meta={purchaseHistorySummary.lastOrderDate ? `Última compra ${date(purchaseHistorySummary.lastOrderDate)}` : null} />
              <IdentityItem icon={CalendarDays} label="Última compra" value={date(purchaseHistorySummary.lastOrderDate)} />
              <IdentityItem icon={FileText} label="Órdenes históricas" value={purchaseHistorySummary.orders} meta={purchaseHistorySummary.lastOrderDate ? `Hasta ${date(purchaseHistorySummary.lastOrderDate)}` : null} />
              <IdentityItem icon={Building2} label="Proveedores" value={purchaseHistorySummary.suppliers} meta={purchaseHistorySummary.lastOrderDate ? `Hasta ${date(purchaseHistorySummary.lastOrderDate)}` : null} />
              <IdentityItem icon={Coins} label="Gasto histórico neto" value={purchaseHistorySummary.netSpend != null ? money(purchaseHistorySummary.netSpend) : null} meta={purchaseHistorySummary.lastOrderDate ? `Acumulado hasta ${date(purchaseHistorySummary.lastOrderDate)}` : null} />
            </div>
          ) : null}
          {procurementOrders.length > 0 ? (
            <div className="divide-y divide-border">
              {procurementOrders.slice(0, 5).map((order) => {
                const supplierName =
                  order.supplier?.trade_name ||
                  order.supplier?.legal_name ||
                  order.supplierScore?.supplier_name ||
                  'Proveedor no informado';
                return (
                  <div key={order.id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_150px_180px] lg:items-center">
                    <div>
                      <p className="font-mono text-xs">{order.order_number || 'OC sin número'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{date(order.issued_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{supplierName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.status || 'Estado no informado'}
                        {order.expected_delivery_date ? ` · entrega esperada ${date(order.expected_delivery_date)}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monto OC</p>
                      <p className="mt-1 text-sm font-medium">
                        {order.total_amount != null ? `${order.currency || 'CLP'} ${number(order.total_amount, 0)}` : 'Sin monto'}
                      </p>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-muted-foreground">Desempeño proveedor</p>
                      <p className="mt-1 text-sm font-medium">
                        {order.supplierScore?.operational_score != null
                          ? `${number(order.supplierScore.operational_score, 0)}/100`
                          : 'Sin score'}
                      </p>
                      {order.supplierScore?.delivery_score != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Entrega {number(order.supplierScore.delivery_score, 0)} · Calidad {number(order.supplierScore.quality_score || 0, 0)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : costCenterPurchaseHistory.length > 0 ? (
            <div>
              <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {purchaseHistorySummary?.matchBasis === 'cost_center'
                  ? `Historial recuperado desde el centro de costo específico ${asset.cost_center_code || ''}. Se muestra como contexto económico del equipo.`
                  : 'Historial recuperado por coincidencia de nombre/modelo con centros de costo históricos. Se presenta como contexto del modelo/equipo y no como atribución unitaria cuando existen varias unidades similares.'}
              </div>
              <div className="divide-y divide-border">
                {costCenterPurchaseHistory.slice(0, 8).map((line) => (
                  <div key={line.id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_180px_140px] lg:items-center">
                    <div>
                      <p className="font-mono text-xs">{line.order_number || 'OC sin número'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{date(line.order_date)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.supplier_name || 'Proveedor no informado'}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {line.product_code || 'Sin código'} · {line.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cantidad / unidad</p>
                      <p className="mt-1 text-sm font-medium">{number(line.quantity || 0, 1)} {line.unit || ''}</p>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-muted-foreground">Monto neto</p>
                      <p className="mt-1 text-sm font-medium">{line.net_amount != null ? money(line.net_amount) : 'Sin monto'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay compras enlazadas directamente al activo ni historial disponible para su centro de costo.
            </p>
          )}
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Cadena de suministro de mantención" hint={`${supplyChain.length} registros enlazados`} />
        <div className="border-t border-border p-4">
          {supplyChain.length > 0 ? (
            <div className="divide-y divide-border">
              {supplyChain.slice(0, 5).map((row) => (
                <div key={row.work_order_id} className="grid gap-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)_150px_150px] lg:items-center">
                  <div>
                    <p className="font-mono text-xs">{row.work_order_number || 'OT sin número'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{date(row.scheduled_date)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.title || 'Mantención'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.supply_chain_status || 'Sin estado'} · {number(row.material_shortage_count || 0)} quiebres · {number(row.open_supply_need_count || 0)} necesidades abiertas
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Compras</p>
                    <p className="mt-1 text-sm font-medium">{number(row.procurement_order_count || 0)} OC</p>
                    <p className="mt-1 text-xs text-muted-foreground">{money(row.procurement_order_amount)}</p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">Materiales</p>
                    <p className="mt-1 text-sm font-medium">
                      {number(row.parts_installed || 0)} instalados
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{money(row.parts_cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay movimientos de cadena de suministro enlazados a este activo.
            </p>
          )}
        </div>
      </details>

      {maintenanceTaskCandidates.length > 0 || standardJobPlans.length > 0 ? (
        <details className="group rounded-lg border border-border bg-card">
          <SectionSummary title="Señales y planes de intervención" hint={`${maintenanceTaskCandidates.length} señales · ${standardJobPlans.length} planes estándar`} />
          <div className="border-t border-border p-4">
            {maintenanceTaskCandidates.length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Señales desde operación
                </p>
                <div className="mt-3 divide-y divide-border">
                  {maintenanceTaskCandidates.slice(0, 6).map((row, index) => (
                    <div key={`${row.component_key || 'signal'}-${index}`} className="grid gap-3 py-3 lg:grid-cols-[160px_minmax(0,1fr)_150px] lg:items-center">
                      <div>
                        <p className="text-sm font-medium">{row.component_key || 'Componente'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.signal_status || row.latest_status || 'Señal'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{row.suggested_task || row.latest_observation || 'Revisar condición observada'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {number(row.observation_count || 0, 0)} observaciones · {number(row.out_of_service_count || 0, 0)} fuera de servicio
                        </p>
                      </div>
                      <div className="lg:text-right">
                        <p className="text-xs text-muted-foreground">Última evidencia</p>
                        <p className="mt-1 text-sm font-medium">{date(row.last_observed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {standardJobPlans.length > 0 ? (
              <div className={maintenanceTaskCandidates.length > 0 ? 'mt-5 border-t border-border pt-4' : ''}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Plan estándar
                </p>
                <div className="mt-3 divide-y divide-border">
                  {standardJobPlans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="grid gap-3 py-3 lg:grid-cols-[150px_minmax(0,1fr)_180px] lg:items-center">
                      <div>
                        <p className="font-mono text-xs">{plan.plan_code || 'Sin código'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.status || 'Sin estado'}
                          {plan.approved_at ? ` · aprobado ${date(plan.approved_at)}` : ''}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{plan.name || plan.work_type || 'Plan de intervención'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.skill_requirement || plan.reason || 'Sin requisito adicional'}
                        </p>
                      </div>
                      <div className="lg:text-right">
                        <p className="text-sm font-medium">
                          {plan.estimated_duration_hours != null ? `${number(plan.estimated_duration_hours, 1)} h` : 'Sin duración'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.labor_people_required != null ? `${number(plan.labor_people_required, 0)} personas` : 'Dotación no informada'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {runtimeCostIntelligence || meterHistory.length > 0 ? (
        <details className="group rounded-lg border border-border bg-card">
          <SectionSummary title="Uso, horómetro y costo por hora" hint={runtimeCostIntelligence?.latest_meter_hours != null ? `${number(runtimeCostIntelligence.latest_meter_hours, 1)} h · registrado ${date(runtimeCostIntelligence.last_reading_at)}` : 'Sin lectura de horómetro disponible'} />
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <IdentityItem
              icon={Gauge}
              label="Último horómetro"
              value={runtimeCostIntelligence?.latest_meter_hours != null ? `${number(runtimeCostIntelligence.latest_meter_hours, 1)} h` : null}
              meta={runtimeCostIntelligence?.last_reading_at ? `Registrado el ${date(runtimeCostIntelligence.last_reading_at)}` : 'Sin fecha de lectura'}
            />
            <IdentityItem
              icon={Timer}
              label="Horas observadas"
              value={runtimeCostIntelligence?.observed_operating_hours != null ? `${number(runtimeCostIntelligence.observed_operating_hours, 1)} h` : null}
              meta={runtimeCostIntelligence?.first_reading_at && runtimeCostIntelligence?.last_reading_at ? `Período ${date(runtimeCostIntelligence.first_reading_at)} → ${date(runtimeCostIntelligence.last_reading_at)}` : null}
            />
            <IdentityItem
              icon={Coins}
              label="Costo auditado / hora"
              value={runtimeCostIntelligence?.audited_cost_per_operating_hour != null ? `${money(runtimeCostIntelligence.audited_cost_per_operating_hour)}/h` : null}
              meta={reliability?.last_audited_closure_at ? `Cierres auditados hasta ${date(reliability.last_audited_closure_at)}` : 'Sin cierre auditado con fecha'}
            />
            <IdentityItem
              icon={FileText}
              label="Lecturas"
              value={runtimeCostIntelligence?.reading_count ?? meterHistory.length}
              meta={runtimeCostIntelligence?.last_reading_at ? `Última el ${date(runtimeCostIntelligence.last_reading_at)}` : null}
            />
          </div>
          {meterHistory.length > 0 ? (
            <div className="border-t border-border px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Últimas lecturas</p>
              <div className="mt-3 divide-y divide-border">
                {meterHistory.slice(0, 6).map((row) => (
                  <div key={row.id} className="grid gap-2 py-2 sm:grid-cols-[140px_120px_minmax(0,1fr)] sm:items-center">
                    <span className="text-xs text-muted-foreground">{date(row.recorded_at)}</span>
                    <span className="text-sm font-medium">{number(row.meter_value || 0, 1)} {row.meter_unit || ''}</span>
                    <span className="truncate text-xs text-muted-foreground">{row.source_kind || row.source_reference || 'Fuente operacional'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
              Sin historial de lecturas de horómetro/medidor enlazado a este activo.
            </div>
          )}
        </details>
      ) : null}

      <details className="group rounded-lg border border-border bg-card" open={planningPriorityText.startsWith('P1') || planningPriorityText.startsWith('P2') || (!maintenancePriority && !latestPlan)}>
        <SectionSummary title="Planificación de mantenimiento" hint={maintenancePriority ? `${maintenancePriority.priority || 'Con pauta'} · ${maintenancePriority.recommended_action || 'plan configurado'}` : latestPlan ? 'Pauta disponible' : 'Sin plan de mantención registrado'} />
        {maintenancePriority ? (
          <>
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <IdentityItem icon={Activity} label="Prioridad" value={maintenancePriority.priority} meta={maintenancePriority.current_reading_at ? `Calculada con lectura del ${date(maintenancePriority.current_reading_at)}` : latestPlan?.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null} />
              <IdentityItem
                icon={Gauge}
                label="Lectura actual"
                value={maintenancePriority.current_reading != null ? `${number(maintenancePriority.current_reading, 1)} ${maintenancePriority.meter_unit || ''}` : null}
                meta={maintenancePriority.current_reading_at ? `Registrado el ${date(maintenancePriority.current_reading_at)}` : 'Sin fecha de lectura'}
              />
              <IdentityItem
                icon={Gauge}
                label="Próximo MP"
                value={maintenancePriority.next_due_meter != null ? `${number(maintenancePriority.next_due_meter, 1)} ${maintenancePriority.meter_unit || ''}` : null}
                meta={maintenancePriority.projected_due_at ? `Proyección ${date(maintenancePriority.projected_due_at)}` : maintenancePriority.scheduled_date ? `Programado ${date(maintenancePriority.scheduled_date)}` : null}
              />
              <IdentityItem
                icon={Timer}
                label="Margen"
                value={maintenancePriority.remaining_meter != null ? `${number(maintenancePriority.remaining_meter, 1)} ${maintenancePriority.meter_unit || ''}` : null}
                meta={maintenancePriority.current_reading_at ? `Con lectura del ${date(maintenancePriority.current_reading_at)}` : null}
              />
              <IdentityItem icon={CalendarDays} label="Fecha proyectada" value={date(maintenancePriority.projected_due_at || maintenancePriority.scheduled_date)} />
              <IdentityItem icon={Wrench} label="Responsable" value={maintenancePriority.responsible_raw} meta={latestPlan?.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null} />
              <IdentityItem icon={PackageCheck} label="Materiales" value={maintenancePriority.parts_status_raw} meta={latestPlan?.updated_at ? `Estado al ${date(latestPlan.updated_at)}` : null} />
              <IdentityItem icon={FileText} label="Estado programación" value={maintenancePriority.programming_status_raw} meta={latestPlan?.updated_at ? `Actualizado ${date(latestPlan.updated_at)}` : null} />
            </div>
            {maintenancePriority.recommended_action ? (
              <div className="border-t border-border px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Acción recomendada</p>
                <p className="mt-2 text-sm font-medium">{maintenancePriority.recommended_action}</p>
                {maintenancePriority.observations ? (
                  <p className="mt-1 text-xs text-muted-foreground">{maintenancePriority.observations}</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : latestPlan ? (
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <IdentityItem icon={Gauge} label="Última MP" value={latestPlan.last_mp != null ? `${number(latestPlan.last_mp, 1)} ${latestPlan.meter_unit || ''}` : null} meta={latestPlan.current_reading_at ? `Lectura al ${date(latestPlan.current_reading_at)}` : latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null} />
            <IdentityItem icon={Timer} label="Intervalo MP" value={latestPlan.interval_mp != null ? `${number(latestPlan.interval_mp, 1)} ${latestPlan.meter_unit || ''}` : null} meta={latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null} />
            <IdentityItem icon={CalendarDays} label="Fecha programada" value={date(latestPlan.scheduled_date)} />
            <IdentityItem icon={Wrench} label="Responsable" value={latestPlan.responsible_raw} meta={latestPlan.updated_at ? `Actualizado ${date(latestPlan.updated_at)}` : null} />
            <IdentityItem icon={Activity} label="Estado" value={latestPlan.programming_status_raw} meta={latestPlan.updated_at ? `Actualizado ${date(latestPlan.updated_at)}` : null} />
            <IdentityItem icon={PackageCheck} label="Materiales" value={latestPlan.parts_status_raw} meta={latestPlan.updated_at ? `Estado al ${date(latestPlan.updated_at)}` : null} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Sin plan de mantención registrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No existe una pauta o planificación de mantenimiento enlazada a este activo en la fuente actual.
              </p>
            </div>
            {data.canEdit ? (
              <Button asChild size="sm">
                <Link
                  href={`/dashboard/mantenimiento/planes-estandar?new=1&assetCode=${encodeURIComponent(asset.asset_code || '')}&assetName=${encodeURIComponent(asset.name || '')}`}
                >
                  <Wrench className="mr-1 h-4 w-4" />
                  Crear plan de mantención
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Sin permisos para crear planes.</p>
            )}
          </div>
        )}
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Historial económico" hint={economicHistory.length > 0 ? `${economicHistory.length} años con movimientos · ${money(economicLifetime)}` : 'Sin movimientos económicos históricos'} />
        <div className="border-t border-border p-4">
          {economicHistory.length > 0 ? (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <IdentityItem icon={Coins} label="Años con movimientos" value={economicHistory.length} />
                <IdentityItem icon={Coins} label="Costo histórico" value={money(economicLifetime)} meta={economicHistory[0]?.last_cost_date ? `Corte ${date(economicHistory[0].last_cost_date)}` : null} />
                <IdentityItem
                  icon={CalendarDays}
                  label="Primer costo"
                  value={date(economicHistory[economicHistory.length - 1]?.first_cost_date)}
                />
                <IdentityItem icon={CalendarDays} label="Último costo" value={date(economicHistory[0]?.last_cost_date)} />
              </div>
              <div className="divide-y divide-border">
                {economicHistory.slice(0, 6).map((row) => (
                  <div key={String(row.fiscal_year)} className="grid gap-3 py-3 sm:grid-cols-[100px_140px_minmax(0,1fr)] sm:items-center">
                    <p className="text-sm font-semibold">{row.fiscal_year || 'Sin año'}</p>
                    <p className="text-sm">{money(row.historical_total_cost)}</p>
                    <p className="text-xs text-muted-foreground">
                      {number(row.movement_count || 0, 0)} movimientos · {date(row.first_cost_date)} → {date(row.last_cost_date)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hay movimientos económicos históricos enlazados a este activo.</p>
          )}
        </div>
      </details>

      {drillingHistory.length > 0 ? (
        <details className="group rounded-lg border border-border bg-card">
          <SectionSummary title="Producción y uso del equipo" hint={drillingHistory[0]?.operation_date ? `${number(drillingMeters, 1)} m en reportes mostrados · hasta ${date(drillingHistory[0].operation_date)}` : 'Sin producción reciente enlazada'} />
          <div className="border-t border-border p-4">
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IdentityItem icon={Gauge} label="Reportes recientes" value={drillingHistory.length} meta={drillingHistory[0]?.operation_date ? `Hasta ${date(drillingHistory[0].operation_date)}` : null} />
              <IdentityItem icon={Activity} label="Metros perforados" value={`${number(drillingMeters, 1)} m`} meta={drillingHistory[0]?.operation_date ? `En reportes mostrados · hasta ${date(drillingHistory[0].operation_date)}` : 'En reportes mostrados'} />
              <IdentityItem icon={CalendarDays} label="Última operación" value={date(drillingHistory[0]?.operation_date)} />
              <IdentityItem icon={MapPin} label="Última faena" value={drillingHistory[0]?.mine_raw || drillingHistory[0]?.site_raw} />
            </div>
            {drillOperationalEvidence ? (
              <div className="mb-4 grid gap-4 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <IdentityItem icon={Activity} label="Operativo" value={drillOperationalEvidence.operational_reports} meta={drillOperationalEvidence.window_start && drillOperationalEvidence.window_end ? `Período ${date(drillOperationalEvidence.window_start)} → ${date(drillOperationalEvidence.window_end)}` : 'Período 90 días'} />
                <IdentityItem icon={Activity} label="Fuera de servicio" value={drillOperationalEvidence.out_of_service_reports} meta={drillOperationalEvidence.window_start && drillOperationalEvidence.window_end ? `Período ${date(drillOperationalEvidence.window_start)} → ${date(drillOperationalEvidence.window_end)}` : 'Período 90 días'} />
                <IdentityItem icon={Timer} label="Downtime 90 días" value={drillOperationalEvidence.recorded_downtime_hours != null ? `${number(drillOperationalEvidence.recorded_downtime_hours, 1)} h` : null} meta={drillOperationalEvidence.window_end ? `Corte ${date(drillOperationalEvidence.window_end)}` : null} />
                <IdentityItem icon={PackageCheck} label="Repuestos instalados 90 días" value={drillOperationalEvidence.quantity_installed} meta={drillOperationalEvidence.window_end ? `Corte ${date(drillOperationalEvidence.window_end)}` : null} />
              </div>
            ) : null}
            {drillEconomicsChange ? (
              <div className="mb-4 grid gap-4 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <IdentityItem icon={Coins} label="Costo/m mes actual" value={drillEconomicsChange.current_cost_clp_per_meter != null ? `${money(drillEconomicsChange.current_cost_clp_per_meter)}/m` : null} meta={drillEconomicsChange.current_month ? `Período ${date(drillEconomicsChange.current_month)}` : null} />
                <IdentityItem icon={Coins} label="Cambio costo/m" value={drillEconomicsChange.cost_per_meter_change_pct != null ? `${number(drillEconomicsChange.cost_per_meter_change_pct, 1)}%` : null} meta={drillEconomicsChange.current_month && drillEconomicsChange.previous_month ? `${date(drillEconomicsChange.previous_month)} → ${date(drillEconomicsChange.current_month)}` : null} />
                <IdentityItem icon={Activity} label="Cambio metros" value={drillEconomicsChange.drilled_meters_change_pct != null ? `${number(drillEconomicsChange.drilled_meters_change_pct, 1)}%` : null} meta={drillEconomicsChange.current_month && drillEconomicsChange.previous_month ? `${date(drillEconomicsChange.previous_month)} → ${date(drillEconomicsChange.current_month)}` : null} />
              </div>
            ) : null}
            {drillEconomics ? (
              <div className="mb-4 grid gap-4 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <IdentityItem icon={Coins} label="Costo 90 días" value={drillEconomics.recognized_cost_clp_90d != null ? money(drillEconomics.recognized_cost_clp_90d) : null} meta={drillEconomics.window_start && drillEconomics.window_end ? `Período ${date(drillEconomics.window_start)} → ${date(drillEconomics.window_end)}` : drillEconomics.last_cost_date ? `Último costo ${date(drillEconomics.last_cost_date)}` : null} />
                <IdentityItem icon={Activity} label="Metros 90 días" value={drillEconomics.drilled_meters_90d != null ? `${number(drillEconomics.drilled_meters_90d, 1)} m` : null} meta={drillEconomics.window_start && drillEconomics.window_end ? `Período ${date(drillEconomics.window_start)} → ${date(drillEconomics.window_end)}` : drillEconomics.last_drilling_date ? `Última perforación ${date(drillEconomics.last_drilling_date)}` : null} />
                <IdentityItem icon={Coins} label="Costo por metro" value={drillEconomics.cost_clp_per_meter_90d != null ? `${money(drillEconomics.cost_clp_per_meter_90d)}/m` : null} meta={drillEconomics.window_end ? `Fecha de corte ${date(drillEconomics.window_end)}` : null} />
                <IdentityItem icon={FileText} label="Evidencia 90 días" value={drillEconomics.evidence_status} meta={drillEconomics.window_end ? `Fecha de corte ${date(drillEconomics.window_end)}` : null} />
              </div>
            ) : null}
            {drillingMaintenanceReview.length > 0 ? (
              <div className="mb-4 rounded-md border border-border">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Señales para revisión de mantención
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {drillingMaintenanceReview.slice(0, 4).map((row) => (
                    <div key={row.source_report_id} className="grid gap-2 px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{date(row.operation_date)}</p>
                        <p className="mt-1 text-xs font-medium">{row.review_status || 'Pendiente'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.review_reason || 'Revisión requerida'}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {row.machine_observations || row.equipment_status_raw || row.decision_note || 'Sin observación adicional'}
                        </p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-xs text-muted-foreground">OT asociada</p>
                        <p className="mt-1 text-sm font-medium">{row.has_linked_work_order ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="divide-y divide-border">
              {drillingHistory.slice(0, 8).map((row) => (
                <div key={row.id} className="grid gap-3 py-3 lg:grid-cols-[120px_120px_minmax(0,1fr)_140px] lg:items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{date(row.operation_date)}</p>
                    <p className="mt-1 font-mono text-xs">{row.hole_code_raw || 'Sin sondaje'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Producción</p>
                    <p className="mt-1 text-sm font-medium">{number(row.drilled_meters || 0, 1)} m</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.operator_name_raw || 'Operador no informado'} · {row.shift_code_raw || 'Sin turno'}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {row.machine_observations || row.drilling_observations || row.equipment_status_raw || 'Sin observaciones'}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="mt-1 text-sm font-medium">{row.sector_raw || row.site_raw || row.mine_raw || 'No informada'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Últimas mantenciones" hint={auditedInterventions.length > 0 ? `${auditedInterventions.length} cierres auditados disponibles` : latestPlan ? `Plan disponible · ${latestMpSummary}` : 'Sin mantenciones auditadas registradas'} />
        <div className="border-t border-border p-4">
          {auditedInterventions.length > 0 ? (
            <div className="divide-y divide-border">
              {auditedInterventions.slice(0, 5).map((item) => (
                <div key={item.id} className="grid gap-3 py-4 lg:grid-cols-[140px_minmax(0,1fr)_140px_140px] lg:items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{date(item.closed_at || item.workOrder?.completion_date)}</p>
                    <p className="mt-1 font-mono text-xs">{item.workOrder?.work_order_number || 'OT sin número'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.workOrder?.title || item.workOrder?.work_type || 'Mantención cerrada'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.workOrder?.root_cause || item.workOrder?.preventive_actions || 'Sin causa o acción documentada.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duración real</p>
                    <p className="mt-1 text-sm font-medium">
                      {item.workOrder?.actual_duration_hours != null ? `${number(item.workOrder.actual_duration_hours, 1)} h` : 'Sin base'}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">Costo auditado</p>
                    <p className="mt-1 text-sm font-medium">{money(item.total_cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : latestPlan ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IdentityItem
                icon={Gauge}
                label="Última MP"
                value={latestPlan.last_mp != null ? `${number(latestPlan.last_mp, 1)} ${latestPlan.meter_unit || ''}` : null}
                meta={latestPlan.current_reading_at ? `Lectura al ${date(latestPlan.current_reading_at)}` : latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null}
              />
              <IdentityItem
                icon={Timer}
                label="Intervalo MP"
                value={latestPlan.interval_mp != null ? `${number(latestPlan.interval_mp, 1)} ${latestPlan.meter_unit || ''}` : null}
                meta={latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null}
              />
              <IdentityItem
                icon={CalendarDays}
                label="Próxima programación"
                value={date(latestPlan.scheduled_date)}
              />
              <IdentityItem
                icon={Wrench}
                label="Responsable"
                value={latestPlan.responsible_raw}
                meta={latestPlan.updated_at ? `Actualizado ${date(latestPlan.updated_at)}` : null}
              />
              <IdentityItem
                icon={Gauge}
                label="Lectura actual"
                value={latestPlan.current_reading != null ? `${number(latestPlan.current_reading, 1)} ${latestPlan.meter_unit || ''}` : null}
                meta={latestPlan.current_reading_at ? `Registrado el ${date(latestPlan.current_reading_at)}` : 'Sin fecha de lectura'}
              />
              <IdentityItem
                icon={Activity}
                label="Estado programación"
                value={latestPlan.programming_status_raw}
                meta={latestPlan.updated_at ? `Actualizado ${date(latestPlan.updated_at)}` : null}
              />
              <IdentityItem
                icon={PackageCheck}
                label="Estado materiales"
                value={latestPlan.parts_status_raw}
                meta={latestPlan.updated_at ? `Estado al ${date(latestPlan.updated_at)}` : null}
              />
              <IdentityItem
                icon={FileText}
                label="Acción programa"
                value={latestPlan.workbook_action_raw || latestPlan.observations}
                meta={latestPlan.updated_at ? `Fuente actualizada ${date(latestPlan.updated_at)}` : null}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay cierres auditados ni una pauta de mantenimiento enlazada a este activo.
            </p>
          )}
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Materiales y repuestos" hint={`${data.installedParts?.length ?? 0} instalados · ${data.pendingParts?.length ?? 0} pendientes`} />
        <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Instalados</p>
              {installedParts.length > 0 ? (
                <div className="mt-3 divide-y divide-border">
                  {installedParts.slice(0, 8).map((part) => (
                    <div key={part.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {part.product?.name || part.product?.product_code || 'Repuesto sin nombre'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {part.workOrder?.work_order_number || 'OT no informada'} · {date(part.installed_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{number(part.quantity_installed || 0, 0)} {part.product?.unit || ''}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {part.total_cost != null ? money(part.total_cost) : part.unit_cost != null ? money(Number(part.unit_cost) * Number(part.quantity_installed || 0)) : 'Sin costo'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No hay repuestos instalados registrados para este activo.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Pendientes</p>
              {pendingParts.length > 0 ? (
                <div className="mt-3 divide-y divide-border">
                  {pendingParts.slice(0, 8).map((part) => {
                    const pending = Math.max(
                      Number(part.quantity_requested || 0) -
                        Number(part.quantity_installed || 0) -
                        Number(part.quantity_returned || 0),
                      0,
                    );
                    return (
                      <div key={part.id} className="flex items-start justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {part.product?.name || part.product?.product_code || 'Repuesto sin nombre'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {part.workOrder?.work_order_number || 'OT no informada'} · {part.status || 'Pendiente'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{number(pending, 0)} {part.product?.unit || ''}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Solicitado {number(part.quantity_requested || 0, 0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : latestPlan?.parts_status_raw ? (
                <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{latestPlan.parts_status_raw}</p>
                  {latestPlan.observations ? (
                    <p className="mt-1 text-xs text-muted-foreground">{latestPlan.observations}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No hay materiales pendientes asociados a este activo.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Vida útil y ciclo del activo" hint={remainingLifeYears != null ? `${number(remainingLifeYears, 1)} años remanentes estimados` : 'Vida útil no informada'} />
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <IdentityItem icon={CalendarDays} label="Fecha adquisición" value={date(asset.acquisition_date)} meta={asset.updated_at ? `Maestro actualizado ${date(asset.updated_at)}` : null} />
          <IdentityItem
            icon={Timer}
            label="Edad estimada"
            value={assetAgeYears != null ? `${number(assetAgeYears, 1)} años` : 'No informado'}
            meta={asset.acquisition_date ? `Calculada desde ${date(asset.acquisition_date)}` : null}
          />
          <IdentityItem
            icon={Timer}
            label="Vida útil esperada"
            value={expectedLifespan != null ? `${number(expectedLifespan, 0)} años` : 'No informado'}
            meta={asset.updated_at ? `Maestro actualizado ${date(asset.updated_at)}` : null}
          />
          <IdentityItem
            icon={Activity}
            label="Vida útil remanente"
            value={remainingLifeYears != null ? `${number(remainingLifeYears, 1)} años` : 'No informado'}
            meta={asset.acquisition_date && expectedLifespan != null ? `Calculada desde adquisición y vida esperada` : null}
          />
        </div>
        <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <IdentityItem icon={Coins} label="Costo adquisición" value={asset.acquisition_cost != null ? money(asset.acquisition_cost) : null} meta={asset.acquisition_date ? `Fecha adquisición ${date(asset.acquisition_date)}` : asset.updated_at ? `Maestro actualizado ${date(asset.updated_at)}` : null} />
          <IdentityItem icon={Timer} label="MTBF base" value={asset.baseline_mtbf_hours != null ? `${number(asset.baseline_mtbf_hours, 0)} h` : null} meta={asset.updated_at ? `Maestro actualizado ${date(asset.updated_at)}` : null} />
          <IdentityItem icon={Timer} label="MTBF real" value={mtbf} meta={reliability?.last_audited_closure_at ? `Cierres auditados hasta ${date(reliability.last_audited_closure_at)}` : 'Sin cierre auditado con fecha'} />
          <IdentityItem icon={Activity} label="Tiempo detenido auditado" value={reliability?.total_downtime_hours != null ? `${number(reliability.total_downtime_hours, 1)} h` : 'Sin base'} meta={reliability?.last_audited_closure_at ? `Hasta cierre ${date(reliability.last_audited_closure_at)}` : null} />
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Actividad reciente del activo" hint={`${recentEvents.length} eventos recientes`} />
        <div className="border-t border-border p-4">
          {recentEvents.length > 0 ? (
            <div className="divide-y divide-border">
              {recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[120px_minmax(0,1fr)_180px] sm:items-center">
                  <span className="text-xs text-muted-foreground">{date(event.event_at)}</span>
                  <span className="text-sm font-medium">{event.summary || event.event_type || 'Evento de mantenimiento'}</span>
                  <span className="text-xs text-muted-foreground sm:text-right">{event.actor_name || 'Actor no informado'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay eventos recientes registrados para este activo.</p>
          )}
        </div>
      </details>

      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary title="Trazabilidad y criterio de evidencia" hint={asset.source_file ? `${asset.source_file} · actualizado ${date(asset.updated_at || asset.imported_at)}` : `Actualizado ${date(asset.updated_at || asset.imported_at)}`} />
        <div className="border-t border-border px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Horómetro, MTBF y MTTR se muestran sólo desde evidencia operacional auditada. El costo se obtiene desde snapshots de cierre auditado. Los campos de identidad ausentes permanecen explícitamente como no informados.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IdentityItem icon={Database} label="Fuente" value={asset.source_file} />
            <IdentityItem icon={FileText} label="Hoja" value={asset.source_sheet} />
            <IdentityItem icon={Hash} label="Fila fuente" value={asset.source_row} />
            <IdentityItem icon={CalendarDays} label="Última actualización" value={date(asset.updated_at || asset.imported_at)} />
            {financeReconciliation ? (
              <IdentityItem
                icon={Coins}
                label="Conciliación finanzas"
                value={`${financeReconciliation.reconciliation_status || 'Sin estado'} · ${financeReconciliation.match_method || 'sin método'}`}
                meta="La vista de conciliación actual no expone timestamp propio"
              />
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <IdentityItem icon={PackageCheck} label="Repuestos instalados" value={data.installedParts?.length ?? 0} meta={latestPartTimestamp ? `Movimientos hasta ${date(latestPartTimestamp)}` : 'Sin timestamp de movimientos'} />
            <IdentityItem icon={PackageCheck} label="Repuestos pendientes" value={data.pendingParts?.length ?? 0} meta={latestPartTimestamp ? `Estado al ${date(latestPartTimestamp)}` : 'Sin timestamp de movimientos'} />
          </div>
        </div>
      </details>
    </div>
  );
}
