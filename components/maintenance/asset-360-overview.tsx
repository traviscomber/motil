'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Coins,
  Gauge,
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
import {
  date,
  money,
  number,
} from '@/components/maintenance/asset-360/format';
import { Asset360IdentityHeader } from '@/components/maintenance/asset-360/identity-header';
import { IdentityItem, SectionSummary } from '@/components/maintenance/asset-360/primitives';
import {
  Asset360CoverageSection,
  Asset360FinanceReconciliation,
  Asset360IdentityHistoryRow,
} from '@/components/maintenance/asset-360/coverage-section';
import { Asset360LifecycleSection } from '@/components/maintenance/asset-360/lifecycle-section';
import {
  Asset360MaterialsSection,
  Asset360PartsRow,
} from '@/components/maintenance/asset-360/materials-section';
import {
  Asset360AuditedIntervention,
  Asset360HistorySection,
  Asset360RecentEvent,
} from '@/components/maintenance/asset-360/history-section';
import {
  Asset360DrillingSection,
  Asset360DrillEconomics,
  Asset360DrillEconomicsChange,
  Asset360DrillingHistoryRow,
  Asset360DrillingMaintenanceReviewRow,
  Asset360DrillOperationalEvidence,
} from '@/components/maintenance/asset-360/drilling-section';
import {
  Asset360MaintenancePlanningRow,
  Asset360MaintenancePriority,
  Asset360PlanningSection,
} from '@/components/maintenance/asset-360/planning-section';
import {
  Asset360InterventionSection,
  Asset360MaintenanceTaskCandidate,
  Asset360StandardJobPlan,
} from '@/components/maintenance/asset-360/intervention-section';
import {
  Asset360MeterHistoryRow,
  Asset360RuntimeCostIntelligence,
  Asset360RuntimeSection,
} from '@/components/maintenance/asset-360/runtime-section';
import {
  Asset360CostCenterPurchaseLine,
  Asset360ProcurementOrder,
  Asset360PurchaseHistorySummary,
  Asset360PurchaseSection,
  Asset360SupplyChainRow,
} from '@/components/maintenance/asset-360/purchase-section';

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
    cost_center_name?: string | null;
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
    cost_center_evidence_source?: string | null;
    location_evidence_source?: string | null;
    location_evidence_at?: string | null;
    criticality_evidence_source?: string | null;
    criticality_evidence_at?: string | null;
    operational_status_evidence_source?: string | null;
    operational_status_evidence_at?: string | null;
    operational_status_reason?: string | null;
    reference_manufacturer?: string | null;
    reference_manufacturer_evidence_source?: string | null;
    reference_manufacturer_evidence_at?: string | null;
    reference_family?: string | null;
    reference_family_evidence_source?: string | null;
    reference_family_evidence_at?: string | null;
    license_plate_evidence_source?: string | null;
    license_plate_evidence_at?: string | null;
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
    latest_meter_unit?: string | null;
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
    meter_evidence_source?: string | null;
    hour_status?: string | null;
    remaining_hours?: number | string | null;
    alert_due?: boolean;
    generated_work_order_id?: string | null;
  } | null;
  recentEvents?: Asset360RecentEvent[];
  auditedInterventions?: Asset360AuditedIntervention[];
  installedParts?: Asset360PartsRow[];
  pendingParts?: Asset360PartsRow[];
  economicHistory?: Array<{
    fiscal_year?: number | null;
    movement_count?: number | string | null;
    historical_total_cost?: number | string | null;
    first_cost_date?: string | null;
    last_cost_date?: string | null;
  }>;
  drillEconomics?: Asset360DrillEconomics;
  drillingMaintenanceReview?: Asset360DrillingMaintenanceReviewRow[];
  drillingHistory?: Asset360DrillingHistoryRow[];
  maintenanceTaskCandidates?: Asset360MaintenanceTaskCandidate[];
  standardJobPlans?: Asset360StandardJobPlan[];
  runtimeCostIntelligence?: Asset360RuntimeCostIntelligence;
  meterHistory?: Asset360MeterHistoryRow[];
  drillOperationalEvidence?: Asset360DrillOperationalEvidence;
  drillEconomicsChange?: Asset360DrillEconomicsChange;
  maintenancePriority?: Asset360MaintenancePriority;
  financeReconciliation?: Asset360FinanceReconciliation;
  identityHistory?: Asset360IdentityHistoryRow[];
  operatingSpine?: {
    last_work_order_at?: string | null;
    last_drilling_date?: string | null;
    last_cost_event_at?: string | null;
    last_telemetry_at?: string | null;
    evidence_domain_count?: number | string | null;
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
    last_drilling_date?: string | null;
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
  supplyChain?: Asset360SupplyChainRow[];
  purchaseHistorySummary?: Asset360PurchaseHistorySummary;
  costCenterPurchaseHistory?: Asset360CostCenterPurchaseLine[];
  procurementOrders?: Asset360ProcurementOrder[];
  maintenancePlanning?: Asset360MaintenancePlanningRow[];
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

export function Asset360Overview({
  assetId,
  scope = 'equipos',
}: {
  assetId: string;
  scope?: 'equipos' | 'vehiculos';
}) {
  const [origin, setOrigin] = useState('https://www.motil.app');
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
        description="Cargando información del activo."
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
  const defendableNextPreventiveMeter = Boolean(
    nextPreventive?.effective_current_meter != null &&
    !(
      Number(nextPreventive.effective_current_meter) === 0 &&
      String(nextPreventive.meter_evidence_source || '').toLowerCase() === 'schedule_snapshot'
    )
  );
  const effectiveMeterUnit = String(
    data.runtimeCostIntelligence?.latest_meter_unit || asset.meter_unit || 'h',
  ).trim().toLowerCase();
  const usesAnnualControl = ['anual', 'annual'].includes(effectiveMeterUnit);
  const effectiveMeterLabel =
    effectiveMeterUnit === 'km'
      ? 'Odómetro'
      : effectiveMeterUnit === 'h'
        ? 'Horómetro'
        : usesAnnualControl
          ? 'Periodicidad'
          : 'Medidor';
  const meterIsScheduleReference =
    data.runtimeCostIntelligence?.meter_evidence_source === 'schedule_snapshot' &&
    !data.runtimeCostIntelligence?.last_reading_at;
  const effectiveMeterDisplayLabel = meterIsScheduleReference
    ? `${effectiveMeterLabel} de pauta`
    : effectiveMeterLabel;
  const effectiveMeterSuffix = effectiveMeterUnit || '';

  const metrics: Metric[] = [
    ['OT activas', summary.activeWorkOrders, Wrench],
    ['Preventivos vencidos', summary.overduePreventives, AlertTriangle],
    ['Bloqueos operativos', summary.operationalBlockers, Activity],
    [
      effectiveMeterDisplayLabel,
      runtime?.latest_meter_hours != null
        ? `${number(runtime.latest_meter_hours, 1)} h`
        : data.runtimeCostIntelligence?.latest_meter_hours != null
          ? `${number(data.runtimeCostIntelligence.latest_meter_hours, 1)} ${effectiveMeterSuffix}`.trim()
          : defendableNextPreventiveMeter
            ? `${number(nextPreventive?.effective_current_meter, 1)} ${asset.meter_unit || 'h'}`.trim()
            : usesAnnualControl
              ? 'Anual'
              : 'Sin lectura',
      Gauge,
    ],
  ];

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

  const recentEvents = data.recentEvents || [];
  const auditedInterventions = data.auditedInterventions || [];
  const installedParts = data.installedParts || [];
  const pendingParts = data.pendingParts || [];
  const maintenancePlanning = data.maintenancePlanning || [];
  const hasAnnualReadingConflict = maintenancePlanning.some((row) => {
    const unit = String(row.meter_unit || '').trim().toLowerCase();
    return ['anual', 'annual'].includes(unit) && row.current_reading != null;
  });
  const operationalState = data.operationalState;
  const operatingSpine = data.operatingSpine;
  const maintenancePriority = data.maintenancePriority;
  const runtimeCostIntelligence = data.runtimeCostIntelligence;
  const maintenanceTaskCandidates = data.maintenanceTaskCandidates || [];
  const standardJobPlans = data.standardJobPlans || [];
  const generatedAt = data.generatedAt;
  const meterHistory = data.meterHistory || [];
  const drillOperationalEvidence = data.drillOperationalEvidence;
  const drillEconomicsChange = data.drillEconomicsChange;
  const financeReconciliation = data.financeReconciliation;
  const identityHistory = data.identityHistory || [];
  const supplyChain = data.supplyChain || [];
  const procurementOrders = data.procurementOrders || [];
  const costCenterPurchaseHistory = data.costCenterPurchaseHistory || [];
  const purchaseHistorySummary = data.purchaseHistorySummary;
  const openSupplyNeedsCount = supplyChain.reduce(
    (sum, row) => sum + Number(row.open_supply_need_count || 0),
    0,
  );
  const materialShortageCount = supplyChain.reduce(
    (sum, row) => sum + Number(row.material_shortage_count || 0),
    0,
  );
  const economicHistory = data.economicHistory || [];
  const drillingHistory = data.drillingHistory || [];
  const drillEconomics = data.drillEconomics;
  const drillingMaintenanceReview = data.drillingMaintenanceReview || [];
  const economicLifetime = economicHistory.reduce(
    (sum, row) => sum + Number(row.historical_total_cost || 0),
    0,
  );
  const economicMovementCount = economicHistory.reduce(
    (sum, row) => sum + Number(row.movement_count || 0),
    0,
  );
  const economicYearsWithMovements = economicHistory.filter(
    (row) => Number(row.movement_count || 0) > 0 || Number(row.historical_total_cost || 0) !== 0,
  ).length;
  const economicAnnualAverage =
    economicYearsWithMovements > 0 ? economicLifetime / economicYearsWithMovements : null;
  const economicFirstCostDate = economicHistory.length > 0
    ? economicHistory[economicHistory.length - 1]?.first_cost_date
    : null;
  const economicLastCostDate =
    economicHistory[0]?.last_cost_date ||
    operatingSpine?.last_cost_event_at ||
    operationalState?.last_cost_at ||
    null;
  const economicLifetimeValue = operationalState?.recognized_cost_clp_lifetime != null
    ? Number(operationalState.recognized_cost_clp_lifetime)
    : economicHistory.length > 0
      ? economicLifetime
      : null;
  const economicYtdValue = operationalState?.recognized_cost_clp_ytd != null
    ? Number(operationalState.recognized_cost_clp_ytd)
    : null;
  const economic12mValue = operationalState?.recognized_cost_clp_12m != null
    ? Number(operationalState.recognized_cost_clp_12m)
    : null;
  const recentDrillingMeters = drillingHistory.reduce(
    (sum, row) => {
      const value = Number(row.drilled_meters);
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    },
    0,
  );
  const consolidatedDrillingMeters =
    operationalState?.drilled_meters != null
      ? Math.max(Number(operationalState.drilled_meters) || 0, 0)
      : recentDrillingMeters;
  const consolidatedDrillingReports =
    operationalState?.drilling_report_count != null
      ? Number(operationalState.drilling_report_count) || 0
      : drillingHistory.length;
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
  const operationalEvidenceDates = [
    operatingSpine?.last_work_order_at,
    operatingSpine?.last_drilling_date,
    operatingSpine?.last_cost_event_at,
    operatingSpine?.last_telemetry_at,
  ].filter(Boolean) as string[];
  const lastOperationalEvidenceAt = operationalEvidenceDates
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.time))
    .sort((a, b) => b.time - a.time)[0]?.value || null;
  const latestEvidence = [
    { value: lastOperationalEvidenceAt, source: 'Operación' },
    { value: latestPlan?.updated_at || null, source: 'Planificación' },
    { value: runtimeCostIntelligence?.last_reading_at || null, source: effectiveMeterLabel },
  ]
    .filter((item): item is { value: string; source: string } => Boolean(item.value))
    .map((item) => ({ ...item, time: new Date(item.value).getTime() }))
    .filter((item) => !Number.isNaN(item.time))
    .sort((a, b) => b.time - a.time)[0] || null;

  const unavailableSources = data.unavailableSources || [];
  const hasPurchaseEvidence = Number(purchaseHistorySummary?.purchaseLines || 0) > 0 || procurementOrders.length > 0;
  const hasMaintenanceEvidence = auditedInterventions.length > 0 || Number(operationalState?.work_order_count || 0) > 0;
  const hasMaterialEvidence = installedParts.length > 0 || pendingParts.length > 0 || supplyChain.length > 0;
  const hasProductionEvidence = drillingHistory.length > 0 || Number(operationalState?.drilling_report_count || 0) > 0;
  const hasRuntimeEvidence =
    meterHistory.length > 0 ||
    Number(runtimeCostIntelligence?.reading_count || 0) > 0 ||
    runtimeCostIntelligence?.latest_meter_hours != null ||
    defendableNextPreventiveMeter;
  const hasEconomicEvidence = economicHistory.length > 0 || Number(operationalState?.recognized_cost_event_count || 0) > 0;
  const hasAvailabilityEvidence = Boolean(
    operationalState?.last_availability_date ||
    operationalState?.availability_pct != null ||
    operationalState?.recorded_downtime_hours != null ||
    Number(operationalState?.open_work_order_count || 0) > 0
  );
  const hasLifecycleEvidence = Boolean(
    asset.acquisition_date ||
    asset.acquisition_cost != null ||
    expectedLifespan != null ||
    remainingLifeYears != null ||
    assetAgeYears != null
  );

  const coverageItems = [
    ['Identidad base', Boolean(asset.asset_code && asset.name), asset.asset_code && asset.name ? 'Disponible' : 'Incompleta'],
    ['Centro de costo', Boolean(asset.cost_center_code), asset.cost_center_code ? 'Disponible' : 'No resuelto'],
    ['Ubicación', Boolean(asset.location), asset.location ? 'Disponible' : 'No resuelta'],
    ['Criticidad', Boolean(asset.criticality), asset.criticality ? 'Disponible' : 'No resuelta'],
    ['Estado operacional', Boolean(asset.operational_status), asset.operational_status ? 'Disponible' : 'Sin estado validado'],
    ['Plan de mantención', Boolean(maintenancePriority || latestPlan), maintenancePriority || latestPlan ? 'Disponible' : 'No registrado'],
    [
      usesAnnualControl ? 'Periodicidad de control' : 'Horómetro / uso',
      usesAnnualControl || hasRuntimeEvidence,
      hasAnnualReadingConflict
        ? 'Anual · lectura numérica por validar'
        : usesAnnualControl
          ? 'Anual'
          : hasRuntimeEvidence
            ? 'Disponible'
            : 'Sin lectura defendible',
    ],
    ['Economía / costos', hasEconomicEvidence, hasEconomicEvidence ? 'Disponible' : 'Sin movimientos'],
    ['Compras / proveedores', hasPurchaseEvidence, hasPurchaseEvidence ? 'Disponible' : 'Sin compras enlazadas'],
    ['OT / mantenciones', hasMaintenanceEvidence, hasMaintenanceEvidence ? 'Disponible' : 'Sin OT enlazadas'],
    ['Materiales / repuestos', hasMaterialEvidence, hasMaterialEvidence ? 'Disponible' : 'Sin movimientos enlazados'],
    ['Vida útil', expectedLifespan != null || asset.acquisition_date != null, expectedLifespan != null || asset.acquisition_date != null ? 'Disponible' : 'No informada'],
    ['Producción / actividad', hasProductionEvidence || recentEvents.length > 0, hasProductionEvidence || recentEvents.length > 0 ? 'Disponible' : 'Sin actividad enlazada'],
  ] as const;
  const coverageAvailableCount = coverageItems.filter(([, available]) => available).length;
  const coverageMissingCount = coverageItems.length - coverageAvailableCount;
  const showExecutionCard = Boolean(
    actionableWorkOrder ||
    summary.pendingPlanSteps ||
    summary.readyToClose ||
    summary.criticalOpen ||
    Number(runtime?.reset_count || 0) > 0
  );
  const hasReliabilityEvidence = Boolean(
    Number(reliability?.audited_closures || 0) > 0 ||
    Number(rr?.audited_corrective_events || 0) > 0
  );
  const maintenanceNeedsAttention = Boolean(
    summary.criticalOpen > 0 ||
    summary.overduePreventives > 0 ||
    summary.operationalBlockers > 0 ||
    actionableWorkOrder
  );
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
  const showAttentionDetail = attention.title !== 'Sin alertas operacionales';

  return (
    <div className="space-y-5">
      <Asset360IdentityHeader
        asset={asset}
        assetNoun={noun}
        basePath={basePath}
        displayCriticality={displayCriticality}
        displayStatus={displayStatus}
        metrics={metrics}
      />

      {showAttentionDetail ? (
        <Card className={`shadow-none ${attention.tone}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Atención</p>
              <p className="mt-1 text-lg font-semibold">{attention.title}</p>
              {attention.detail ? <p className="mt-1 text-sm text-muted-foreground">{attention.detail}</p> : null}
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
      ) : null}

      <details className="group rounded-lg border border-border bg-card" open={maintenanceNeedsAttention}>
        <SectionSummary
          title="Mantenimiento"
          hint={nextPreventive
            ? `Próximo: ${nextPreventive.task_name || 'preventivo'}${nextPreventive.due_meter != null ? ` · ${number(nextPreventive.due_meter, 0)} h` : ''}`
            : 'Sin pauta horaria registrada'}
        />
        <div className="border-t border-border">
          <div className={`grid gap-px bg-border ${showExecutionCard ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
            <div className="bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Próxima intervención
              </p>
              {nextPreventive ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{nextPreventive.task_name || 'Pauta configurada'}</p>
                    <Badge variant={nextPreventive.alert_due ? 'destructive' : 'outline'}>
                      {nextPreventive.alert_due
                        ? 'Vencido'
                        : String(nextPreventive.hour_status || '').toLowerCase() === 'pending'
                          ? 'Pendiente'
                          : nextPreventive.hour_status || 'Pendiente'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Horómetro actual:{' '}
                    {nextPreventive.effective_current_meter == null
                      ? 'sin lectura'
                      : `${number(nextPreventive.effective_current_meter, 1)} h`}
                    {' · '}
                    Vence:{' '}
                    {nextPreventive.due_meter == null
                      ? 'sin base'
                      : `${number(nextPreventive.due_meter, 1)} h`}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
                    <Link href="/dashboard/mantenimiento/preventivo-horas">
                      Abrir pauta
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No hay pauta horaria configurada para este equipo.
                </p>
              )}
            </div>

            {showExecutionCard ? (
              <div className="bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Trabajo en curso
                </p>
                <div className="mt-3 grid grid-cols-3 gap-4">
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
                </div>
                {actionableWorkOrder ? (
                  <Button asChild size="sm" className="mt-4">
                    <Link
                      href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(
                        actionableWorkOrder.work_order_id,
                      )}`}
                    >
                      Continuar trabajo
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <details className="group border-t border-border px-5 py-4">
            <summary className="cursor-pointer list-none">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Confiabilidad auditada</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {hasReliabilityEvidence
                      ? `MTBF ${mtbf} · MTTR ${mttr}`
                      : 'Sin cierres auditados suficientes para métricas de confiabilidad'}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-4">
              <IdentityItem icon={Timer} label="MTBF real" value={mtbf} />
              <IdentityItem icon={Timer} label="MTTR" value={mttr} />
              <IdentityItem
                icon={ShieldCheck}
                label="Cierres auditados"
                value={Number(reliability?.audited_closures || 0)}
              />
              <IdentityItem
                icon={AlertTriangle}
                label="Causas recurrentes"
                value={Number(reliability?.recurring_cause_count || 0)}
              />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
              <Link href="/dashboard/mantenimiento/confiabilidad">
                Ver confiabilidad
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </details>
        </div>
      </details>

      {hasAvailabilityEvidence ? (
      <details className="group rounded-lg border border-border bg-card">
        <SectionSummary
          title="Disponibilidad"
          hint={operationalState?.last_availability_date
            ? `${operationalState.availability_pct != null ? `${number(operationalState.availability_pct, 1)}%` : 'Sin base'} · ${operationalState.open_work_order_count || 0} OT abiertas`
            : 'Sin base de disponibilidad'}
        />
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <IdentityItem
            icon={Activity}
            label="Disponibilidad"
            value={operationalState?.availability_pct != null ? `${number(operationalState.availability_pct, 1)}%` : 'Sin base'}
            meta={operationalState?.last_availability_date
              ? `Fecha de corte ${date(operationalState.last_availability_date)}`
              : operationalState?.availability_evidence_status || (operationalState?.availability_days_30d ? 'Período: últimos 30 días' : 'Sin fecha de corte')}
          />
          <IdentityItem
            icon={Timer}
            label="Detención registrada"
            value={operationalState?.recorded_downtime_hours != null ? `${number(operationalState.recorded_downtime_hours, 1)} h` : 'Sin base'}
            meta={generatedAt ? `Acumulado al corte ${date(generatedAt)}` : null}
          />
          <IdentityItem
            icon={Wrench}
            label="OT abiertas"
            value={operationalState?.open_work_order_count}
            meta={generatedAt ? `Estado consultado ${date(generatedAt)}` : null}
          />
        </div>
      </details>
      ) : null}

      <Card className="border-border/80 shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Economía</p>
              <h2 className="mt-1 text-lg font-semibold">Inversión en mantenimiento</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Gasto reconocido y enlazado al equipo. No equivale al costo total de propiedad.
              </p>
            </div>
            {economicLastCostDate ? (
              <p className="text-xs text-muted-foreground">Corte {date(economicLastCostDate)}</p>
            ) : null}
          </div>

          {economicLifetimeValue != null || economicHistory.length > 0 ? (
            <div>
              <div className="grid gap-4 py-5 sm:grid-cols-3">
                <IdentityItem
                  icon={Coins}
                  label="Histórico acumulado"
                  value={economicLifetimeValue != null ? money(economicLifetimeValue) : 'Sin base'}
                  meta={economicFirstCostDate ? `Desde ${date(economicFirstCostDate)}` : null}
                />
                <IdentityItem
                  icon={CalendarDays}
                  label="Últimos 12 meses"
                  value={economic12mValue != null ? money(economic12mValue) : 'Sin base'}
                  meta={economicLastCostDate ? `Corte ${date(economicLastCostDate)}` : null}
                />
                <IdentityItem
                  icon={CalendarDays}
                  label="Última imputación"
                  value={date(economicLastCostDate)}
                  meta={economicMovementCount > 0 ? `${economicMovementCount} movimientos reconocidos` : null}
                />
              </div>

              {(economicYtdValue != null || economicAnnualAverage != null || economicHistory.length > 0) ? (
                <details className="group border-t border-border pt-4">
                  <summary className="cursor-pointer list-none">
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium">Detalle económico</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <IdentityItem
                      icon={CalendarDays}
                      label="Año en curso"
                      value={economicYtdValue != null ? money(economicYtdValue) : 'Sin base'}
                    />
                    <IdentityItem
                      icon={Coins}
                      label="Promedio anual"
                      value={economicAnnualAverage != null ? money(economicAnnualAverage) : 'Sin base'}
                      meta={economicYearsWithMovements > 0 ? `${economicYearsWithMovements} años con movimientos` : null}
                    />
                  </div>
                  {economicHistory.length > 0 ? (
                    <div className="mt-4 divide-y divide-border border-t border-border">
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
                  ) : null}
                </details>
              ) : null}
            </div>
          ) : (
            <div className="py-5">
              <p className="text-sm font-medium">Sin historial de costos enlazado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No se registra inversión histórica de mantenimiento para este equipo en las fuentes disponibles. Esto no equivale a costo cero.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Asset360PurchaseSection
        hasPurchaseEvidence={hasPurchaseEvidence}
        supplyChain={supplyChain}
        procurementOrders={procurementOrders}
        costCenterPurchaseHistory={costCenterPurchaseHistory}
        purchaseHistorySummary={purchaseHistorySummary}
        openSupplyNeedsCount={openSupplyNeedsCount}
        materialShortageCount={materialShortageCount}
        costCenterCode={asset.cost_center_code}
      />

      <Asset360InterventionSection
        maintenanceTaskCandidates={maintenanceTaskCandidates}
        standardJobPlans={standardJobPlans}
      />

      <Asset360RuntimeSection
        hasRuntimeEvidence={hasRuntimeEvidence}
        runtimeCostIntelligence={runtimeCostIntelligence}
        meterHistory={meterHistory}
        effectiveMeterLabel={effectiveMeterLabel}
        effectiveMeterSuffix={effectiveMeterSuffix}
        effectiveMeterDisplayLabel={effectiveMeterDisplayLabel}
        meterIsScheduleReference={meterIsScheduleReference}
      />

      <Asset360PlanningSection
        planningPriorityText={planningPriorityText}
        maintenancePriority={maintenancePriority}
        latestPlan={latestPlan}
        canEdit={data.canEdit}
        assetCode={asset.asset_code}
        assetName={asset.name}
      />

      <Asset360DrillingSection
        drillingHistory={drillingHistory}
        recentDrillingMeters={recentDrillingMeters}
        consolidatedDrillingMeters={consolidatedDrillingMeters}
        consolidatedDrillingReports={consolidatedDrillingReports}
        lastDrillingDate={operatingSpine?.last_drilling_date}
        drillOperationalEvidence={drillOperationalEvidence}
        drillEconomics={drillEconomics}
        drillEconomicsChange={drillEconomicsChange}
        drillingMaintenanceReview={drillingMaintenanceReview}
      />

      <Asset360HistorySection
        auditedInterventions={auditedInterventions}
        recentEvents={recentEvents}
      />

      <Asset360MaterialsSection
        hasMaterialEvidence={hasMaterialEvidence}
        pendingParts={pendingParts}
        installedParts={installedParts}
        latestPlanPartsStatus={latestPlan?.parts_status_raw}
      />

      <Asset360LifecycleSection
        hasLifecycleEvidence={hasLifecycleEvidence}
        assetAgeYears={assetAgeYears}
        expectedLifespan={expectedLifespan}
        remainingLifeYears={remainingLifeYears}
        acquisitionDate={asset.acquisition_date}
        acquisitionCost={asset.acquisition_cost}
      />

      <Asset360CoverageSection
        coverageItems={coverageItems}
        coverageAvailableCount={coverageAvailableCount}
        coverageMissingCount={coverageMissingCount}
        asset={asset}
        displayCriticality={displayCriticality}
        displayStatus={displayStatus}
        effectiveMeterLabel={effectiveMeterLabel}
        effectiveMeterSuffix={effectiveMeterSuffix}
        meterHours={runtimeCostIntelligence?.latest_meter_hours}
        meterEvidenceSource={runtimeCostIntelligence?.meter_evidence_source}
        usesAnnualControl={usesAnnualControl}
        hasAnnualReadingConflict={hasAnnualReadingConflict}
        latestEvidence={latestEvidence}
        evidenceDomainCount={operatingSpine?.evidence_domain_count}
        financeReconciliation={financeReconciliation}
        identityHistory={identityHistory}
      />
    </div>
  );
}
