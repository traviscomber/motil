export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const { data: asset, error: assetError } = await context.supabase
      .from('maintenance_canonical_assets_v1')
      .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,cost_center_code,is_active,validation_status,source_file,source_sheet,source_row,imported_at,updated_at,source_payload')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    const sourcePayload =
      asset.source_payload && typeof asset.source_payload === 'object'
        ? (asset.source_payload as Record<string, unknown>)
        : {};
    const normalizedAsset = {
      id: asset.id,
      asset_code: asset.asset_code,
      name: asset.name,
      asset_type: asset.asset_type,
      category: asset.category,
      manufacturer: asset.manufacturer || sourcePayload.manufacturer || null,
      model: asset.model || sourcePayload.model || null,
      serial_number: asset.serial_number || sourcePayload.serial_number || null,
      license_plate: asset.license_plate,
      cost_center_code: asset.cost_center_code,
      location: sourcePayload.location || sourcePayload.mine || null,
      criticality: sourcePayload.criticality || sourcePayload.criticality_raw || null,
      operational_status: sourcePayload.status || sourcePayload.operational_status || null,
      meter_unit: sourcePayload.meter_unit || null,
      mobility_class: sourcePayload.mobility_class || null,
      lifecycle_state: sourcePayload.lifecycle_state || null,
      lifecycle_reason: sourcePayload.lifecycle_reason || null,
      acquisition_date: sourcePayload.acquisition_date || null,
      acquisition_cost: sourcePayload.acquisition_cost ?? null,
      expected_lifespan_years: sourcePayload.expected_lifespan_years ?? null,
      baseline_mtbf_hours: sourcePayload.mtbf_hours ?? null,
      source_file: asset.source_file,
      source_sheet: asset.source_sheet,
      source_row: asset.source_row,
      imported_at: asset.imported_at,
      updated_at: asset.updated_at,
      is_active: asset.is_active,
      validation_status: asset.validation_status,
    };

    const [ordersResult, closeResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult, snapshotsResult, partsResult, eventsResult] = await Promise.all([
      context.supabase
        .from('maintenance_operational_work_order_flow_v1')
        .select('work_order_id,work_order_number,status,priority,work_type,scheduled_date,assigned_person_name,flow_status,open_purchase_order_count,quantity_requested,quantity_issued,quantity_installed,total_cost')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .neq('status', 'completed')
        .order('scheduled_date', { ascending: true, nullsFirst: false }),
      context.supabase
        .from('work_order_close_readiness_v2')
        .select('work_order_id,work_order_number,next_action,ready_to_close,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,standard_plan_steps_pending,missing_runtime_evidence')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('schedule_id,task_name,priority,frequency_hours,due_meter,effective_current_meter,meter_evidence_source,hour_status,remaining_hours,alert_due,generated_work_order_id')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .eq('enabled', true),
      context.supabase
        .from('asset_runtime_summary_v1')
        .select('reading_count,last_reading_at,latest_meter_hours,observed_operating_hours,reset_count,usable_for_rate_metrics')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('audited_closures,recurring_cause_count,max_same_cause_occurrences,audited_total_cost,audited_avg_cost,total_actual_hours,total_downtime_hours,avg_days_between_audited_interventions,has_recurring_root_cause,last_audited_closure_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('maintenance_runtime_reliability_by_asset_v1')
        .select('audited_corrective_events,corrective_events_with_meter,valid_mtbf_intervals,mtbf_operating_hours,mttr_hours,audited_corrective_cost,audited_downtime_hours,meter_event_coverage_percent,last_corrective_close_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('work_order_closure_cost_snapshots')
        .select('id,work_order_id,closure_sequence,parts_cost,labor_cost,effective_external_cost,total_cost,closed_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('closed_at', { ascending: false })
        .limit(100),
      context.supabase
        .from('work_order_parts')
        .select('id,work_order_id,canonical_product_id,quantity_requested,quantity_reserved,quantity_issued,quantity_installed,quantity_returned,unit_cost,status,installed_at,notes')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('created_at', { ascending: false })
        .limit(200),
      context.supabase
        .from('work_order_events')
        .select('id,work_order_id,event_type,event_at,actor_name,summary')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('event_at', { ascending: false })
        .limit(30),
    ]);

    const error = ordersResult.error || closeResult.error || preventiveResult.error || runtimeResult.error || reliabilityResult.error || runtimeReliabilityResult.error || snapshotsResult.error || partsResult.error || eventsResult.error;
    if (error) throw error;

    const closeRows = closeResult.data || [];
    const preventives = [...(preventiveResult.data || [])].sort((a: any, b: any) => {
      if (Boolean(a.alert_due) !== Boolean(b.alert_due)) return a.alert_due ? -1 : 1;
      const ar = a.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(a.remaining_hours);
      const br = b.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(b.remaining_hours);
      return ar - br;
    });

    const snapshotRows = snapshotsResult.data || [];
    const latestSnapshots = Array.from(snapshotRows.reduce((map: Map<string, any>, row: any) => {
      const current = map.get(row.work_order_id);
      if (!current || Number(row.closure_sequence || 0) > Number(current.closure_sequence || 0)) map.set(row.work_order_id, row);
      return map;
    }, new Map()).values()).sort((a: any, b: any) => new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime());

    const workOrderIds = Array.from(new Set([
      ...latestSnapshots.map((row: any) => row.work_order_id),
      ...(partsResult.data || []).map((row: any) => row.work_order_id),
    ].filter(Boolean)));
    const workOrderResult = workOrderIds.length
      ? await context.supabase
          .from('maintenance_work_orders')
          .select('id,work_order_number,title,status,priority,work_type,scheduled_date,start_date,completion_date,root_cause,preventive_actions,actual_duration_hours')
          .eq('organization_id', context.organizationId)
          .in('id', workOrderIds)
      : { data: [], error: null };
    if (workOrderResult.error) throw workOrderResult.error;
    const workOrdersById = new Map((workOrderResult.data || []).map((row: any) => [row.id, row]));

    const productIds = Array.from(new Set((partsResult.data || []).map((row: any) => row.canonical_product_id).filter(Boolean)));
    const productResult = productIds.length
      ? await context.supabase
          .from('canonical_products_v1')
          .select('id,product_code,name,unit')
          .eq('organization_id', context.organizationId)
          .in('id', productIds)
      : { data: [], error: null };
    if (productResult.error) throw productResult.error;
    const productsById = new Map((productResult.data || []).map((row: any) => [row.id, row]));

    const parts = (partsResult.data || []).map((row: any) => ({
      ...row,
      product: productsById.get(row.canonical_product_id) || null,
      workOrder: workOrdersById.get(row.work_order_id) || null,
    }));
    const installedParts = parts.filter((row: any) => Number(row.quantity_installed || 0) > 0);
    const pendingParts = parts.filter((row: any) => Math.max(Number(row.quantity_requested || 0) - Number(row.quantity_installed || 0) - Number(row.quantity_returned || 0), 0) > 0);

    const auditedInterventions = latestSnapshots.map((row: any) => ({
      ...row,
      workOrder: workOrdersById.get(row.work_order_id) || null,
    }));

    const summary = {
      activeWorkOrders: (ordersResult.data || []).length,
      criticalOpen: (ordersResult.data || []).filter((row: any) => String(row.priority || '').toLowerCase() === 'critical').length,
      operationalBlockers: closeRows.filter((row: any) => Number(row.open_procurement_orders || 0) > 0 || Number(row.pending_parts || 0) > 0 || Number(row.unmet_material_requirements || 0) > 0 || Number(row.pending_external_services || 0) > 0 || Number(row.open_labor_entries || 0) > 0).length,
      readyToClose: closeRows.filter((row: any) => Boolean(row.ready_to_close)).length,
      pendingPlanSteps: closeRows.reduce((sum: number, row: any) => sum + Number(row.standard_plan_steps_pending || 0), 0),
      overduePreventives: preventives.filter((row: any) => Boolean(row.alert_due)).length,
      installedPartLines: installedParts.length,
      pendingPartLines: pendingParts.length,
      auditedInterventions: auditedInterventions.length,
    };

    return NextResponse.json({
      asset: normalizedAsset,
      summary,
      workOrders: ordersResult.data || [],
      closeReadiness: closeRows,
      preventives,
      nextPreventive: preventives[0] || null,
      runtime: runtimeResult.data || null,
      reliability: reliabilityResult.data || null,
      runtimeReliability: runtimeReliabilityResult.data || null,
      auditedInterventions,
      installedParts,
      pendingParts,
      recentEvents: eventsResult.data || [],
      canEdit: access.canWrite,
      evidence: {
        mtbf: 'Sólo desde intervalos correctivos auditados con horómetro válido.',
        mttr: 'Sólo desde horas reales de correctivos auditados.',
        cost: 'Sólo desde el último snapshot auditado de cada cierre de OT.',
        parts: 'Cantidades observadas en work_order_parts; no se infiere stock disponible.',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la Ficha 360 operacional' }, { status: 500 });
  }
}
