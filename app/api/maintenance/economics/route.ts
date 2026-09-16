export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const closedStatuses = ['completed', 'closed', 'cancelled', 'canceled'];

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [costResult, reliabilityResult, openResult, runtimeResult, assetResult, recurrenceResult, historyResult] = await Promise.all([
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
    ]);

    const error = costResult.error || reliabilityResult.error || openResult.error || runtimeResult.error || assetResult.error || recurrenceResult.error || historyResult.error;
    if (error) throw error;

    const workOrders = openResult.data || [];
    const active = workOrders.filter((row: any) => !closedStatuses.includes(String(row.status || '').toLowerCase()));
    const blockers = new Set(['missing_asset', 'blocked', 'blocked_asset', 'blocked_execution']);
    const usableRuntime = (runtimeResult.data || []).filter((row: any) => row.usable_for_rate_metrics);
    const rateReady = usableRuntime.filter((row: any) => Number(row.audited_closures || 0) > 0 && row.audited_cost_per_operating_hour != null);
    const historyRows = historyResult.data || [];

    const annualMap = new Map<number, { fiscal_year: number; historical_total_cost: number; movement_count: number; assets: Set<string> }>();
    const assetMap = new Map<string, any>();
    let historicalTotalCost = 0;
    let historicalMovements = 0;
    let firstHistoricalDate: string | null = null;
    let lastHistoricalDate: string | null = null;

    for (const row of historyRows as any[]) {
      const year = Number(row.fiscal_year);
      const cost = Number(row.historical_total_cost || 0);
      const movements = Number(row.movement_count || 0);
      historicalTotalCost += cost;
      historicalMovements += movements;
      if (row.first_cost_date && (!firstHistoricalDate || row.first_cost_date < firstHistoricalDate)) firstHistoricalDate = row.first_cost_date;
      if (row.last_cost_date && (!lastHistoricalDate || row.last_cost_date > lastHistoricalDate)) lastHistoricalDate = row.last_cost_date;

      const annual = annualMap.get(year) || { fiscal_year: year, historical_total_cost: 0, movement_count: 0, assets: new Set<string>() };
      annual.historical_total_cost += cost;
      annual.movement_count += movements;
      if (row.canonical_asset_id) annual.assets.add(row.canonical_asset_id);
      annualMap.set(year, annual);

      const key = String(row.canonical_asset_id || row.asset_code || 'unknown');
      const asset = assetMap.get(key) || {
        canonical_asset_id: row.canonical_asset_id,
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
      assetMap.set(key, asset);
    }

    const historicalAssets = [...assetMap.values()];
    const historicalAnnual = [...annualMap.values()]
      .sort((a, b) => a.fiscal_year - b.fiscal_year)
      .map((row) => ({ ...row, asset_count: row.assets.size, assets: undefined }));

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
      historical_actual_cost: historicalTotalCost,
      historical_movements: historicalMovements,
      historical_assets: historicalAssets.length,
      historical_active_assets: historicalAssets.filter((row: any) => row.is_active).length,
      historical_inactive_assets: historicalAssets.filter((row: any) => !row.is_active).length,
      historical_first_date: firstHistoricalDate,
      historical_last_date: lastHistoricalDate,
    };

    const readiness = {
      economics_ready: summary.audited_work_orders > 0,
      reliability_ready: summary.assets_with_audited_closures > 0,
      rate_metrics_ready: summary.assets_with_cost_per_operating_hour > 0,
      historical_economics_ready: summary.historical_movements > 0,
      mtbf_ready: false,
    };

    const actions = [] as Array<{ key: string; severity: 'critical' | 'warning' | 'info'; title: string; evidence: string; href: string }>;
    if (summary.operational_blockers > 0) actions.push({ key: 'blockers', severity: 'critical', title: 'Destrabar OT con bloqueo operacional', evidence: `${summary.operational_blockers} OT abiertas con bloqueo técnico u operacional`, href: '/dashboard/mantenimiento/ordenes-trabajo/cierre' });
    if (summary.unassigned_open_work_orders > 0) actions.push({ key: 'assignment', severity: 'warning', title: 'Asignar responsables canónicos', evidence: `${summary.unassigned_open_work_orders} OT abiertas sin persona canónica asignada`, href: '/dashboard/mantenimiento/ordenes-trabajo' });
    if (!readiness.economics_ready) actions.push({ key: 'audit', severity: 'info', title: 'Crear la primera base económica auditada', evidence: 'Aún no existen cierres con snapshot de costo; MOTIL no calculará ahorro ni costo unitario sin esa evidencia.', href: '/dashboard/mantenimiento/ordenes-trabajo/cierre' });
    if (!readiness.rate_metrics_ready) actions.push({ key: 'runtime', severity: 'info', title: 'Construir cobertura de horómetros', evidence: `${summary.runtime_usable_assets}/${summary.runtime_assets} activos tienen horas observadas utilizables; todavía no hay costo/hora defendible.`, href: '/dashboard/mantenimiento/horometros' });

    return NextResponse.json({
      summary,
      readiness,
      actions,
      topAssets: assetResult.data || [],
      recurringCauses: recurrenceResult.data || [],
      costPerOperatingHour: rateReady
        .sort((a: any, b: any) => Number(b.audited_cost_per_operating_hour || 0) - Number(a.audited_cost_per_operating_hour || 0))
        .slice(0, 10),
      historicalAnnual,
      historicalAssets: historicalAssets
        .sort((a: any, b: any) => Number(b.historical_total_cost || 0) - Number(a.historical_total_cost || 0))
        .slice(0, 10),
      rules: {
        economics: 'Sólo costos de cierres con snapshot auditado.',
        historical_economics: 'Historia financiera reconocida por activo canónico; incluye equipos inactivos y no se suma al costo auditado de OT.',
        rate: 'Costo por hora sólo cuando el activo tiene horas observadas utilizables y cierres auditados.',
        recurrence: 'Recurrencia sólo cuando la misma causa raíz auditada aparece al menos dos veces en el mismo activo.',
        no_inference: 'Datos faltantes permanecen desconocidos; no se convierten en cero ni en ahorro estimado.',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar Maintenance Economics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
