export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const closedStatuses = ['completed', 'closed', 'cancelled', 'canceled'];

const numeric = (value: unknown) => Number(value || 0);
const text = (value: unknown) => String(value ?? '').trim();
const hasOperationalSignal = (value: unknown) => {
  const normalized = text(value).toLowerCase();
  return Boolean(normalized) && !['0', 'no', 'n/a', 'na', '-'].includes(normalized);
};

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [costResult, reliabilityResult, openResult, runtimeResult, assetResult, recurrenceResult, historyResult, drillingResult] = await Promise.all([
      context.supabase
        .from('maintenance_cost_intelligence_summary_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_reliability_summary_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_operational_work_order_flow_v1')
        .select('work_order_id,work_order_number,status,priority,assigned_person_id,assigned_person_name,flow_status,asset_code,asset_name,total_cost,start_date,scheduled_date')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_runtime_cost_intelligence_v1')
        .select('*')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('audited_total_cost', { ascending: false })
        .limit(10),
      context.supabase
        .from('maintenance_reliability_by_root_cause_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('is_recurring', true)
        .order('occurrences', { ascending: false })
        .limit(10),
      context.supabase
        .from('maintenance_asset_economic_history_v1')
        .select('canonical_asset_id,asset_code,asset_name,asset_category,is_active,fiscal_year,movement_count,historical_total_cost,first_cost_date,last_cost_date')
        .eq('organization_id', context.organizationId)
        .order('fiscal_year', { ascending: true }),
      context.supabase
        .from('production_drilling_source_reports')
        .select('canonical_asset_id,operation_date,drilled_meters,equipment_status_raw,equipment_without_crew_raw,power_outage_raw,water_shortage_raw')
        .eq('organization_id', context.organizationId)
        .not('canonical_asset_id', 'is', null)
        .order('operation_date', { ascending: true })
        .limit(10000),
    ]);

    const error = costResult.error || reliabilityResult.error || openResult.error || runtimeResult.error || assetResult.error || recurrenceResult.error || historyResult.error || drillingResult.error;
    if (error) throw error;

    const workOrders = openResult.data || [];
    const active = workOrders.filter((row: any) => !closedStatuses.includes(String(row.status || '').toLowerCase()));
    const blockers = new Set(['missing_asset', 'blocked', 'blocked_asset', 'blocked_execution']);
    const usableRuntime = (runtimeResult.data || []).filter((row: any) => row.usable_for_rate_metrics);
    const rateReady = usableRuntime.filter((row: any) => Number(row.audited_closures || 0) > 0 && row.audited_cost_per_operating_hour != null);

    const historicalAnnualMap = new Map<number, { fiscal_year: number; historical_total_cost: number; movement_count: number; asset_ids: Set<string> }>();
    const historicalAssetMap = new Map<string, any>();
    let historicalTotalCost = 0;
    let historicalMovements = 0;
    let historicalFirstDate: string | null = null;
    let historicalLastDate: string | null = null;

    for (const row of historyResult.data || []) {
      const assetId = String(row.canonical_asset_id || '');
      const year = Number(row.fiscal_year);
      const cost = numeric(row.historical_total_cost);
      const movements = numeric(row.movement_count);
      historicalTotalCost += cost;
      historicalMovements += movements;
      if (row.first_cost_date && (!historicalFirstDate || row.first_cost_date < historicalFirstDate)) historicalFirstDate = row.first_cost_date;
      if (row.last_cost_date && (!historicalLastDate || row.last_cost_date > historicalLastDate)) historicalLastDate = row.last_cost_date;

      const annual = historicalAnnualMap.get(year) || { fiscal_year: year, historical_total_cost: 0, movement_count: 0, asset_ids: new Set<string>() };
      annual.historical_total_cost += cost;
      annual.movement_count += movements;
      if (assetId) annual.asset_ids.add(assetId);
      historicalAnnualMap.set(year, annual);

      if (!assetId) continue;
      const asset = historicalAssetMap.get(assetId) || {
        canonical_asset_id: assetId,
        asset_code: row.asset_code,
        asset_name: row.asset_name,
        asset_category: row.asset_category,
        is_active: row.is_active,
        historical_total_cost: 0,
        movement_count: 0,
        first_cost_date: row.first_cost_date,
        last_cost_date: row.last_cost_date,
      };
      asset.historical_total_cost += cost;
      asset.movement_count += movements;
      if (row.first_cost_date && (!asset.first_cost_date || row.first_cost_date < asset.first_cost_date)) asset.first_cost_date = row.first_cost_date;
      if (row.last_cost_date && (!asset.last_cost_date || row.last_cost_date > asset.last_cost_date)) asset.last_cost_date = row.last_cost_date;
      historicalAssetMap.set(assetId, asset);
    }

    const observedAnnualMap = new Map<number, any>();
    const observedAssetMap = new Map<string, any>();
    let firstObservedAt: string | null = null;
    let lastObservedAt: string | null = null;

    for (const row of drillingResult.data || []) {
      const assetId = String(row.canonical_asset_id || '');
      const operationDate = String(row.operation_date || '');
      const year = new Date(`${operationDate}T00:00:00Z`).getUTCFullYear();
      if (!assetId || !Number.isFinite(year)) continue;

      const status = text(row.equipment_status_raw).toUpperCase();
      const isOutOfService = status === 'FUERA DE SERVICIO';
      const isObservation = status === 'OPERATIVO CON OBSERVACIONES';
      const isOperational = status === 'OPERATIVO';
      const hasExternalConstraint = hasOperationalSignal(row.equipment_without_crew_raw) || hasOperationalSignal(row.power_outage_raw) || hasOperationalSignal(row.water_shortage_raw);

      if (operationDate && (!firstObservedAt || operationDate < firstObservedAt)) firstObservedAt = operationDate;
      if (operationDate && (!lastObservedAt || operationDate > lastObservedAt)) lastObservedAt = operationDate;

      const annual = observedAnnualMap.get(year) || {
        fiscal_year: year,
        report_count: 0,
        asset_ids: new Set<string>(),
        drilled_meters: 0,
        operational_reports: 0,
        observation_reports: 0,
        out_of_service_reports: 0,
        external_constraint_reports: 0,
      };
      annual.report_count += 1;
      annual.asset_ids.add(assetId);
      annual.drilled_meters += numeric(row.drilled_meters);
      if (isOperational) annual.operational_reports += 1;
      if (isObservation) annual.observation_reports += 1;
      if (isOutOfService) annual.out_of_service_reports += 1;
      if (hasExternalConstraint) annual.external_constraint_reports += 1;
      observedAnnualMap.set(year, annual);

      const observedAsset = observedAssetMap.get(assetId) || {
        canonical_asset_id: assetId,
        report_count: 0,
        drilled_meters: 0,
        operational_reports: 0,
        observation_reports: 0,
        out_of_service_reports: 0,
        external_constraint_reports: 0,
        first_report_at: operationDate || null,
        last_report_at: operationDate || null,
      };
      observedAsset.report_count += 1;
      observedAsset.drilled_meters += numeric(row.drilled_meters);
      if (isOperational) observedAsset.operational_reports += 1;
      if (isObservation) observedAsset.observation_reports += 1;
      if (isOutOfService) observedAsset.out_of_service_reports += 1;
      if (hasExternalConstraint) observedAsset.external_constraint_reports += 1;
      if (operationDate && (!observedAsset.first_report_at || operationDate < observedAsset.first_report_at)) observedAsset.first_report_at = operationDate;
      if (operationDate && (!observedAsset.last_report_at || operationDate > observedAsset.last_report_at)) observedAsset.last_report_at = operationDate;
      observedAssetMap.set(assetId, observedAsset);
    }

    const fleetAnnual = [...new Set([...historicalAnnualMap.keys(), ...observedAnnualMap.keys()])]
      .sort((a, b) => a - b)
      .map((year) => {
        const historical = historicalAnnualMap.get(year);
        const observed = observedAnnualMap.get(year);
        return {
          fiscal_year: year,
          historical_total_cost: historical?.historical_total_cost ?? null,
          movement_count: historical?.movement_count ?? 0,
          historical_asset_count: historical?.asset_ids.size ?? 0,
          observed_report_count: observed?.report_count ?? 0,
          observed_asset_count: observed?.asset_ids.size ?? 0,
          drilled_meters: observed?.drilled_meters ?? null,
          operational_reports: observed?.operational_reports ?? 0,
          observation_reports: observed?.observation_reports ?? 0,
          out_of_service_reports: observed?.out_of_service_reports ?? 0,
          external_constraint_reports: observed?.external_constraint_reports ?? 0,
        };
      });

    const historicalAssets = [...historicalAssetMap.values()]
      .map((asset) => ({ ...asset, observed_condition: observedAssetMap.get(asset.canonical_asset_id) || null }))
      .sort((a, b) => Number(b.historical_total_cost || 0) - Number(a.historical_total_cost || 0));

    const summary = {
      open_work_orders: active.length,
      unassigned_open_work_orders: active.filter((row: any) => !row.assigned_person_id).length,
      operational_blockers: active.filter((row: any) => blockers.has(String(row.flow_status || '').toLowerCase())).length,
      completed_work_orders: Number(costResult.data?.completed_work_orders || 0),
      audited_work_orders: Number(costResult.data?.audited_work_orders || 0),
      audited_coverage_percent: costResult.data?.audited_coverage_percent ?? null,
      audited_total_cost: Number(costResult.data?.audited_total_cost || 0),
      assets_with_audited_closures: Number(reliabilityResult.data?.assets_with_audited_closures || 0),
      assets_with_recurring_root_cause: Number(reliabilityResult.data?.assets_with_recurring_root_cause || 0),
      total_downtime_hours: Number(reliabilityResult.data?.total_downtime_hours || 0),
      runtime_assets: (runtimeResult.data || []).length,
      runtime_usable_assets: usableRuntime.length,
      assets_with_cost_per_operating_hour: rateReady.length,
      historical_total_cost: historicalTotalCost,
      historical_movements: historicalMovements,
      historical_assets: historicalAssets.length,
      historical_active_assets: historicalAssets.filter((row) => row.is_active).length,
      historical_inactive_assets: historicalAssets.filter((row) => !row.is_active).length,
      historical_first_date: historicalFirstDate,
      historical_last_date: historicalLastDate,
      observed_condition_reports: (drillingResult.data || []).length,
      observed_condition_assets: observedAssetMap.size,
      observed_condition_first_date: firstObservedAt,
      observed_condition_last_date: lastObservedAt,
    };

    const readiness = {
      historical_economics_ready: summary.historical_movements > 0,
      observed_condition_ready: summary.observed_condition_reports > 0,
      economics_ready: summary.audited_work_orders > 0,
      reliability_ready: summary.assets_with_audited_closures > 0,
      rate_metrics_ready: summary.assets_with_cost_per_operating_hour > 0,
      mtbf_ready: false,
    };

    const actions = [] as Array<{ key: string; severity: 'critical' | 'warning' | 'info'; title: string; evidence: string; href: string }>;
    if (summary.operational_blockers > 0) actions.push({ key: 'blockers', severity: 'critical', title: 'Destrabar OT con bloqueo operacional', evidence: `${summary.operational_blockers} OT abiertas con bloqueo técnico u operacional`, href: '/dashboard/mantenimiento/ordenes-trabajo/cierre' });
    if (summary.unassigned_open_work_orders > 0) actions.push({ key: 'assignment', severity: 'warning', title: 'Asignar responsables canónicos', evidence: `${summary.unassigned_open_work_orders} OT abiertas sin persona canónica asignada`, href: '/dashboard/mantenimiento/ordenes-trabajo' });
    if (!readiness.economics_ready) actions.push({ key: 'audit', severity: 'info', title: 'Crear la primera base económica auditada', evidence: 'Existe historia financiera, pero aún faltan cierres modernos con snapshot de costo para explicar causas y ejecución.', href: '/dashboard/mantenimiento/ordenes-trabajo/cierre' });
    if (!readiness.rate_metrics_ready) actions.push({ key: 'runtime', severity: 'info', title: 'Construir cobertura de horómetros', evidence: `${summary.runtime_usable_assets}/${summary.runtime_assets} activos tienen horas observadas utilizables; todavía no hay costo/hora defendible.`, href: '/dashboard/mantenimiento/horometros' });

    return NextResponse.json({
      summary,
      readiness,
      actions,
      historicalAnnual: fleetAnnual.map(({ fiscal_year, historical_total_cost, movement_count, historical_asset_count }) => ({ fiscal_year, historical_total_cost, movement_count, asset_count: historical_asset_count })),
      historicalAssets: historicalAssets.slice(0, 10),
      observedCondition: {
        evidence_type: 'production_drilling_reports',
        report_count: summary.observed_condition_reports,
        asset_count: summary.observed_condition_assets,
        first_report_at: firstObservedAt,
        last_report_at: lastObservedAt,
        annual: fleetAnnual.filter((row) => row.observed_report_count > 0),
      },
      fleetAnnual,
      topAssets: assetResult.data || [],
      recurringCauses: recurrenceResult.data || [],
      costPerOperatingHour: rateReady
        .sort((a: any, b: any) => Number(b.audited_cost_per_operating_hour || 0) - Number(a.audited_cost_per_operating_hour || 0))
        .slice(0, 10),
      rules: {
        historical_economics: 'Historia financiera reconocida y vinculada por canonical_asset_id; no se suma ni se confunde con costo auditado de OT.',
        observed_condition: 'Estados de reportes productivos describen condición observada y restricciones externas; no prueban una falla mecánica ni su causa.',
        overlap: 'La coincidencia temporal entre costo histórico y condición observada no implica causalidad ni habilita costo por metro.',
        economics: 'Sólo costos de cierres con snapshot auditado explican la economía moderna de una intervención.',
        rate: 'Costo por hora sólo cuando el activo tiene horas observadas utilizables y cierres auditados.',
        recurrence: 'Recurrencia sólo cuando la misma causa raíz auditada aparece al menos dos veces en el mismo activo.',
        no_inference: 'Datos faltantes permanecen desconocidos; no se convierten en cero, ahorro estimado, probabilidad de falla ni diagnóstico.',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar Maintenance Economics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
