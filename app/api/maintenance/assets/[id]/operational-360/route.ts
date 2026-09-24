export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { deriveMachinesFromCostCenters, getRedistributableMachineAssignment, inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

const OPTIONAL_SOURCE_TIMEOUT_MS = 2500;

function normalizeAssetIdentity(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(SONDA|EQUIPO|MAQUINA|MÁQUINA)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

function normalizeLocationEvidence(value: unknown) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^MINA\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || ['#ERROR!', 'NO REGISTRADO', 'N/A', 'SIN MINA ASIGNADA', 'SIN ASIGNAR', 'NO ASIGNADO'].includes(normalized)) {
    return '';
  }
  return normalized;
}

function cleanCategoricalEvidence(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (['#ERROR!', 'NO REGISTRADO', 'N/A', 'SIN ASIGNAR', 'NO ASIGNADO', 'DESCONOCIDO'].includes(normalized)) {
    return '';
  }
  return raw;
}

function normalizeCriticalityEvidence(value: unknown) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (['alta', 'high'].includes(normalized)) return 'high';
  if (['media', 'medium'].includes(normalized)) return 'medium';
  if (['baja', 'low'].includes(normalized)) return 'low';
  if (['critica', 'critical'].includes(normalized)) return 'critical';
  return normalized || '';
}

function inferManufacturerFromName(value: unknown) {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const brands: Array<[RegExp, string]> = [
    [/\bATLAS COPCO\b/, 'Atlas Copco'],
    [/\bCATERPILLAR\b/, 'Caterpillar'],
    [/\bCAT\b/, 'Caterpillar'],
    [/\bTOYOTA\b/, 'Toyota'],
    [/\bWEICHAI\b/, 'Weichai'],
    [/\bWILSON\b/, 'Wilson'],
    [/\bVOLKSWAGEN\b/, 'Volkswagen'],
    [/\bFORD\b/, 'Ford'],
    [/\bNISSAN\b/, 'Nissan'],
    [/\bMITSUBISHI\b/, 'Mitsubishi'],
    [/\bCHEVROLET\b/, 'Chevrolet'],
    [/\bDOOSAN\b/, 'Doosan'],
    [/\bSULLAIR\b/, 'Sullair'],
    [/\bJCB\b/, 'JCB'],
    [/\bPOSITRON\b/, 'Positron'],
    [/\bINGETROL\b/, 'Ingetrol'],
    [/\bSANDVIK\b/, 'Sandvik'],
    [/\bEPIROC\b/, 'Epiroc'],
    [/\bPAUS\b/, 'Paus'],
    [/\bXCMG\b/, 'XCMG'],
    [/\bMANITOU\b/, 'Manitou'],
  ];

  return brands.find(([pattern]) => pattern.test(raw))?.[1] || null;
}

function inferChileanPlateFromName(value: unknown) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/(?:^|[\s-])([A-Z]{4}-[0-9]{2}|[A-Z]{2}-[0-9]{4})$/);
  return match?.[1] || null;
}

function isRoadVehicleIdentity(...values: unknown[]) {
  const normalized = values
    .map((value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase(),
    )
    .join(' ');
  return /\b(CAMIONETA|CAMIONETAS|CAMION|CAMIONES|BUS|BUSES|FURGON|VEHICULO|VEHICLE|TRUCK|PICKUP)\b/.test(normalized);
}

function withOptionalTimeout<T>(query: PromiseLike<T>, source: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        data: null,
        error: {
          code: 'OPTIONAL_TIMEOUT',
          message: `${source} exceeded ${OPTIONAL_SOURCE_TIMEOUT_MS}ms soft timeout`,
        },
      } as T);
    }, OPTIONAL_SOURCE_TIMEOUT_MS);
  });

  return Promise.race([Promise.resolve(query), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

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

    const { data: canonicalCurrent, error: canonicalCurrentError } = await context.supabase
      .from('canonical_assets_current')
      .select('asset_type,location,operational_status,manufacturer,model,serial_number,criticality,mtbf_hours,acquisition_date,acquisition_cost,expected_lifespan_years,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();
    if (canonicalCurrentError) throw canonicalCurrentError;

    const sourcePayload =
      asset.source_payload && typeof asset.source_payload === 'object'
        ? (asset.source_payload as Record<string, unknown>)
        : {};

    const purchaseSelect =
      'id,order_number,line_number,product_code,description,quantity,unit,unit_cost,net_amount,cost_center_code,asset_reference,supplier_name,order_date,status';
    const costCenterPurchaseHistoryPromise = asset.cost_center_code
      ? context.supabase
          .from('canonical_purchase_order_lines_current')
          .select(purchaseSelect)
          .eq('organization_id', context.organizationId)
          .ilike('cost_center_code', `${asset.cost_center_code} %`)
          .order('order_date', { ascending: false, nullsFirst: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null });

    const purchaseNameTokens = String(asset.name || '')
      .split(/\s+/)
      .map((token) => token.replace(/[^\p{L}\p{N}-]+/gu, ''))
      .filter((token) => token.length >= 3)
      .filter((token) => !['ano', 'año', 'camion', 'camión', 'cargador', 'frontal', 'generador', 'grua', 'grúa', 'horquilla', 'scoop', 'sonda', 'jumbo', 'excavadora', 'manipulador', 'telescopico', 'telescópico'].includes(token.toLowerCase()))
      .slice(0, 5);
    const purchaseNamePattern =
      purchaseNameTokens.length >= 2 ? `%${purchaseNameTokens.join('%')}%` : null;
    const namePurchaseHistoryPromise =
      !asset.cost_center_code && purchaseNamePattern
        ? context.supabase
            .from('canonical_purchase_order_lines_current')
            .select(purchaseSelect)
            .eq('organization_id', context.organizationId)
            .ilike('cost_center_code', purchaseNamePattern)
            .order('order_date', { ascending: false, nullsFirst: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null });
    const isDrillRig = String(asset.asset_type || '').toLowerCase() === 'drill_rig';

    const exactCostCenterDetailPromise = asset.cost_center_code
      ? context.supabase
          .from('cost_centers')
          .select('id,code,name,description,status')
          .eq('organization_id', context.organizationId)
          .eq('code', asset.cost_center_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const costCenterMatchPromise =
      !asset.cost_center_code && asset.name
        ? context.supabase
            .from('cost_centers')
            .select('id,code,name,description,status')
            .eq('organization_id', context.organizationId)
        : Promise.resolve({ data: [], error: null });

    const normalizedAsset = {
      id: asset.id,
      asset_code: asset.asset_code,
      name: asset.name,
      asset_type: asset.asset_type || canonicalCurrent?.asset_type || null,
      category: asset.category,
      manufacturer: asset.manufacturer || sourcePayload.manufacturer || canonicalCurrent?.manufacturer || null,
      model: asset.model || sourcePayload.model || canonicalCurrent?.model || null,
      serial_number: asset.serial_number || sourcePayload.serial_number || canonicalCurrent?.serial_number || null,
      license_plate: asset.license_plate,
      cost_center_code: asset.cost_center_code,
      location: sourcePayload.location || sourcePayload.mine || canonicalCurrent?.location || null,
      criticality: sourcePayload.criticality || sourcePayload.criticality_raw || canonicalCurrent?.criticality || null,
      operational_status: sourcePayload.status || sourcePayload.operational_status || canonicalCurrent?.operational_status || null,
      meter_unit: sourcePayload.meter_unit || null,
      mobility_class: sourcePayload.mobility_class || null,
      lifecycle_state: sourcePayload.lifecycle_state || null,
      lifecycle_reason: sourcePayload.lifecycle_reason || null,
      acquisition_date: sourcePayload.acquisition_date || canonicalCurrent?.acquisition_date || null,
      acquisition_cost: sourcePayload.acquisition_cost ?? canonicalCurrent?.acquisition_cost ?? null,
      expected_lifespan_years: sourcePayload.expected_lifespan_years ?? canonicalCurrent?.expected_lifespan_years ?? null,
      baseline_mtbf_hours: sourcePayload.mtbf_hours ?? canonicalCurrent?.mtbf_hours ?? null,
      source_file: asset.source_file,
      source_sheet: asset.source_sheet,
      source_row: asset.source_row,
      imported_at: asset.imported_at,
      updated_at: asset.updated_at,
      is_active: asset.is_active,
      validation_status: asset.validation_status,
    };

    const [ordersResult, closeResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult, snapshotsResult, partsResult, eventsResult, statusHistoryResult, planningResult, operationalStateResult, operatingSpineResult, supplyChainResult, procurementOrdersResult, costCenterPurchaseHistoryResult, namePurchaseHistoryResult, economicHistoryResult, drillingHistoryResult, drillEconomicsResult, drillingReviewResult, maintenancePriorityResult, financeReconciliationResult, runtimeCostResult, meterHistoryResult, drillEvidenceResult, drillEconomicsChangeResult, taskCandidatesResult, standardPlanResult, identityHistoryResult, exactCostCenterDetailResult, costCenterMatchResult] = await Promise.all([
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
        .select('id,work_order_id,canonical_product_id,quantity_requested,quantity_reserved,quantity_issued,quantity_installed,quantity_returned,unit_cost,status,installed_at,notes,created_at,updated_at')
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
      context.supabase
        .from('maintenance_asset_status_history')
        .select('previous_state,new_state,reason,changed_at,source')
        .eq('organization_id', context.organizationId)
        .eq('asset_id', id)
        .order('changed_at', { ascending: false })
        .limit(1),
      context.supabase
        .from('planning_maintenance_source_rows')
        .select('id,source_row,mine_raw,asset_name_raw,meter_unit,interval_mp,last_mp,initial_reading_at,initial_reading,current_reading_at,current_reading,criticality_raw,scheduled_date,programming_status_raw,responsible_raw,parts_status_raw,observations,workbook_priority_raw,workbook_action_raw,updated_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('updated_at', { ascending: false })
        .limit(5),
      context.supabase
        .from('asset_operational_state_v1')
        .select('operational_status,criticality,location,recognized_cost_event_count,last_cost_at,recognized_cost_clp_lifetime,recognized_cost_clp_ytd,recognized_cost_clp_12m,work_order_count,open_work_order_count,recorded_downtime_hours,drilling_report_count,drilled_meters,sensor_count,sensor_reading_count,evidence_domain_count,availability_evidence_status,availability_pct,last_availability_date,availability_days_30d,scheduled_minutes_30d,downtime_minutes_30d')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('asset_operating_spine_v1')
        .select('last_work_order_at,last_drilling_date,last_cost_event_at,last_telemetry_at,evidence_domain_count')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('work_order_supply_chain_v1')
        .select('work_order_id,work_order_number,title,work_order_status,priority,scheduled_date,material_requirement_count,material_shortage_count,material_shortage_quantity,supply_need_count,open_supply_need_count,supply_needs_with_request,procurement_request_count,open_procurement_request_count,promoted_procurement_request_count,procurement_order_count,undelivered_order_count,delivered_order_count,procurement_order_amount,part_line_count,parts_requested,parts_issued,parts_installed,parts_cost,stock_movement_count,stock_movement_cost,supply_chain_status')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('scheduled_date', { ascending: false, nullsFirst: false })
        .limit(10),
      context.supabase
        .from('procurement_operational_orders')
        .select('id,order_number,supplier_id,status,currency,total_amount,expected_delivery_date,actual_delivery_date,issued_at,updated_at,work_order_id')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('issued_at', { ascending: false, nullsFirst: false })
        .limit(10),
      costCenterPurchaseHistoryPromise,
      namePurchaseHistoryPromise,
      context.supabase
        .from('maintenance_asset_economic_history_v1')
        .select('fiscal_year,movement_count,historical_total_cost,first_cost_date,last_cost_date')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('fiscal_year', { ascending: false }),
      isDrillRig
        ? context.supabase
            .from('production_drilling_source_reports')
            .select('id,operation_date,hole_code_raw,rig_name_raw,site_raw,shift_code_raw,operator_name_raw,drilled_meters,machine_observations,drilling_observations,equipment_status_raw,mine_raw,sector_raw')
            .eq('organization_id', context.organizationId)
            .eq('canonical_asset_id', id)
            .order('operation_date', { ascending: false, nullsFirst: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      isDrillRig
        ? withOptionalTimeout(
            context.supabase
              .from('drill_asset_unit_economics_90d_v1')
              .select('window_start,window_end,last_cost_date,last_drilling_date,recognized_cost_events_90d,recognized_cost_clp_90d,drilling_reports_90d,drilled_meters_90d,cost_clp_per_meter_90d,evidence_status')
              .eq('organization_id', context.organizationId)
              .eq('canonical_asset_id', id)
              .maybeSingle(),
            'drillEconomics',
          )
        : Promise.resolve({ data: null, error: null }),
      isDrillRig
        ? context.supabase
            .from('drilling_maintenance_review_queue_v1')
            .select('source_report_id,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,linked_work_order_id,decision_note,reviewed_at,has_linked_work_order,policy')
            .eq('organization_id', context.organizationId)
            .eq('canonical_asset_id', id)
            .order('operation_date', { ascending: false, nullsFirst: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
      context.supabase
        .from('planning_maintenance_priority_v1')
        .select('meter_unit,interval_mp,last_mp,next_due_meter,current_reading_at,current_reading,remaining_meter,interval_consumed,utilization_per_day,projected_days,projected_due_at,criticality_raw,criticality_score,urgency_score,total_score,priority,recommended_action,scheduled_date,programming_status_raw,responsible_raw,parts_status_raw,observations,match_method,match_score')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      withOptionalTimeout(
        context.supabase
          .from('finance_asset_reconciliation_v1')
          .select('finance_asset_id,finance_asset_code,finance_asset_name,candidate_count,reconciliation_status,match_method')
          .eq('organization_id', context.organizationId)
          .eq('canonical_asset_id', id)
          .maybeSingle(),
        'financeReconciliation',
      ),
      context.supabase
        .from('maintenance_runtime_cost_intelligence_v1')
        .select('reading_count,first_reading_at,last_reading_at,latest_meter_hours,observed_operating_hours,reset_count,usable_for_rate_metrics,audited_closures,audited_total_cost,audited_cost_per_operating_hour')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('planning_asset_meter_readings')
        .select('id,canonical_asset_id,recorded_at,meter_value,meter_unit,source_kind,source_reference')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('recorded_at', { ascending: false })
        .limit(24),
      isDrillRig
        ? withOptionalTimeout(
            context.supabase
              .from('drill_asset_operational_evidence_90d_v1')
              .select('window_start,window_end,drilling_reports,out_of_service_reports,operational_with_observations_reports,operational_reports,invalid_status_reports,equipment_without_crew_reports,power_outage_reports,water_shortage_reports,install_disassembly_reports,scaling_reports,work_order_count,open_work_order_count,recorded_downtime_hours,external_cost_clp,part_line_count,quantity_installed,installed_parts_cost_clp,availability_days,scheduled_minutes,availability_downtime_minutes,evidence_status')
              .eq('organization_id', context.organizationId)
              .eq('canonical_asset_id', id)
              .maybeSingle(),
            'drillEvidence',
          )
        : Promise.resolve({ data: null, error: null }),
      isDrillRig
        ? withOptionalTimeout(
            context.supabase
              .from('drill_asset_unit_economics_change_v1')
              .select('current_month,previous_month,current_cost_clp_per_meter,previous_cost_clp_per_meter,current_cost_clp,previous_cost_clp,current_drilled_meters,previous_drilled_meters,cost_per_meter_change_pct,drilled_meters_change_pct,recognized_cost_change_pct,interpretation_policy')
              .eq('organization_id', context.organizationId)
              .eq('canonical_asset_id', id)
              .maybeSingle(),
            'drillEconomicsChange',
          )
        : Promise.resolve({ data: null, error: null }),
      isDrillRig
        ? context.supabase
            .from('maintenance_operation_task_candidates_v1')
            .select('rig_name,component_key,suggested_task,observation_count,out_of_service_count,first_observed_at,last_observed_at,latest_status,latest_observation,signal_status,evidence_class')
            .eq('organization_id', context.organizationId)
            .eq('canonical_asset_id', id)
            .order('last_observed_at', { ascending: false, nullsFirst: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
      context.supabase
        .from('maintenance_standard_job_plans')
        .select('id,plan_code,name,work_type,status,estimated_duration_hours,labor_people_required,skill_requirement,safety_controls,required_document_reference,reason,evidence_reference,approved_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('updated_at', { ascending: false })
        .limit(5),
      context.supabase
        .from('asset_identity_unified_preview_v1')
        .select('source_asset_id,source_asset_code,source_asset_name,target_asset_id,target_asset_code,target_asset_name,evidence_rule,identity_status,canonicalized')
        .eq('organization_id', context.organizationId)
        .eq('target_asset_id', id)
        .eq('canonicalized', true),
      exactCostCenterDetailPromise,
      costCenterMatchPromise,
    ]);

    const sourceResults = [
      ['workOrders', ordersResult],
      ['closeReadiness', closeResult],
      ['preventives', preventiveResult],
      ['runtime', runtimeResult],
      ['reliability', reliabilityResult],
      ['runtimeReliability', runtimeReliabilityResult],
      ['closureSnapshots', snapshotsResult],
      ['parts', partsResult],
      ['events', eventsResult],
      ['statusHistory', statusHistoryResult],
      ['maintenancePlanning', planningResult],
      ['operationalState', operationalStateResult],
      ['operatingSpine', operatingSpineResult],
      ['supplyChain', supplyChainResult],
      ['procurementOrders', procurementOrdersResult],
      ['purchaseHistoryCostCenter', costCenterPurchaseHistoryResult],
      ['purchaseHistoryName', namePurchaseHistoryResult],
      ['economicHistory', economicHistoryResult],
      ['drillingHistory', drillingHistoryResult],
      ['drillEconomics', drillEconomicsResult],
      ['drillingReview', drillingReviewResult],
      ['maintenancePriority', maintenancePriorityResult],
      ['financeReconciliation', financeReconciliationResult],
      ['runtimeCost', runtimeCostResult],
      ['meterHistory', meterHistoryResult],
      ['drillEvidence', drillEvidenceResult],
      ['drillEconomicsChange', drillEconomicsChangeResult],
      ['taskCandidates', taskCandidatesResult],
      ['standardPlans', standardPlanResult],
      ['identityHistory', identityHistoryResult],
      ['exactCostCenterDetail', exactCostCenterDetailResult],
      ['costCenterMatch', costCenterMatchResult],
    ] as const;
    const sourceErrors = sourceResults
      .filter(([, result]) => Boolean(result.error))
      .map(([source, result]) => ({
        source,
        code: result.error?.code || null,
        message: result.error?.message || 'query_failed',
      }));
    if (sourceErrors.length > 0) {
      console.warn('[asset-360] optional sources unavailable', { assetId: id, sourceErrors });
    }

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

    const supplierIds = Array.from(
      new Set((procurementOrdersResult.data || []).map((row: any) => row.supplier_id).filter(Boolean)),
    );
    const [supplierResult, supplierScoreResult] = supplierIds.length
      ? await Promise.all([
          context.supabase
            .from('canonical_suppliers_v1')
            .select('id,legal_name,trade_name,payment_terms,email,phone')
            .eq('organization_id', context.organizationId)
            .in('id', supplierIds),
          context.supabase
            .from('supplier_operational_score_v2')
            .select('supplier_id,supplier_name,total_orders,completed_orders,on_time_orders,last_delivery_date,receipt_count,quantity_received,quantity_accepted,quantity_rejected,returns_count,delivery_score,quality_score,invoice_score,operational_score,evidence_dimensions')
            .eq('organization_id', context.organizationId)
            .in('supplier_id', supplierIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (supplierResult.error) throw supplierResult.error;
    if (supplierScoreResult.error) throw supplierScoreResult.error;
    const suppliersById = new Map((supplierResult.data || []).map((row: any) => [row.id, row]));
    const supplierScoresById = new Map((supplierScoreResult.data || []).map((row: any) => [row.supplier_id, row]));
    const procurementOrders = (procurementOrdersResult.data || []).map((row: any) => ({
      ...row,
      supplier: suppliersById.get(row.supplier_id) || null,
      supplierScore: supplierScoresById.get(row.supplier_id) || null,
    }));

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

    const normalizedAssetIdentity = normalizeAssetIdentity(asset.name);
    const derivedCostCenterMachines = deriveMachinesFromCostCenters(
      (costCenterMatchResult.data || []).map((center: any) => ({
        id: String(center.id),
        code: String(center.code || ''),
        name: String(center.name || ''),
        description: center.description || null,
        status: center.status || null,
      }))
    );
    const exactCostCenterMatches = derivedCostCenterMachines.filter((machine) =>
      normalizedAssetIdentity &&
      normalizeAssetIdentity(machine.name) === normalizedAssetIdentity
    );
    const canonicalExactCostCenterMatches = exactCostCenterMatches.filter(
      (machine) => !getRedistributableMachineAssignment(machine.code),
    );
    const exactCostCenter =
      !asset.cost_center_code && exactCostCenterMatches.length === 1
        ? exactCostCenterMatches[0]
        : !asset.cost_center_code && canonicalExactCostCenterMatches.length === 1
          ? canonicalExactCostCenterMatches[0]
          : null;

    const purchaseExactCostCenterMatches = new Map<string, { code: string; description: string }>();
    if (!asset.cost_center_code && !exactCostCenter?.code && normalizedAssetIdentity) {
      for (const row of namePurchaseHistoryResult.data || []) {
        const rawCostCenter = String(row.cost_center_code || '').trim();
        const match = rawCostCenter.match(/^(\S+)\s+(.+)$/);
        if (!match) continue;
        const [, code, description] = match;
        if (normalizeAssetIdentity(description) !== normalizedAssetIdentity) continue;
        if (!purchaseExactCostCenterMatches.has(code)) {
          purchaseExactCostCenterMatches.set(code, { code, description });
        }
      }
    }
    const purchaseExactCostCenterCandidates = [...purchaseExactCostCenterMatches.values()];
    const purchaseCanonicalCostCenterCandidates = purchaseExactCostCenterCandidates.filter(
      (candidate) => !getRedistributableMachineAssignment(candidate.code),
    );
    const purchaseExactCostCenter =
      purchaseExactCostCenterCandidates.length === 1
        ? purchaseExactCostCenterCandidates[0]
        : purchaseCanonicalCostCenterCandidates.length === 1
          ? purchaseCanonicalCostCenterCandidates[0]
          : null;

    const derivedCostCenterPurchaseHistoryResult =
      !asset.cost_center_code && exactCostCenter?.code
        ? await context.supabase
            .from('canonical_purchase_order_lines_current')
            .select(purchaseSelect)
            .eq('organization_id', context.organizationId)
            .ilike('cost_center_code', `${exactCostCenter.code} %`)
            .order('order_date', { ascending: false, nullsFirst: false })
            .limit(100)
        : { data: [], error: null };
    const purchaseExactCostCenterHistoryResult =
      !asset.cost_center_code && !exactCostCenter?.code && purchaseExactCostCenter?.code
        ? await context.supabase
            .from('canonical_purchase_order_lines_current')
            .select(purchaseSelect)
            .eq('organization_id', context.organizationId)
            .ilike('cost_center_code', `${purchaseExactCostCenter.code} %`)
            .order('order_date', { ascending: false, nullsFirst: false })
            .limit(100)
        : { data: [], error: null };

    if (derivedCostCenterPurchaseHistoryResult.error || purchaseExactCostCenterHistoryResult.error) {
      console.warn('[asset-360] derived cost center purchase history unavailable', {
        assetId: id,
        costCenterCode: exactCostCenter?.code || purchaseExactCostCenter?.code || null,
        error: derivedCostCenterPurchaseHistoryResult.error || purchaseExactCostCenterHistoryResult.error,
      });
    }

    const purchaseHistoryMatchBasis = asset.cost_center_code
      ? 'cost_center'
      : exactCostCenter?.code
        ? 'cost_center_derived'
        : purchaseExactCostCenter?.code
          ? 'purchase_cost_center_exact_identity'
          : 'name_model';
    const purchaseHistoryRows = asset.cost_center_code
      ? costCenterPurchaseHistoryResult.data || []
      : exactCostCenter?.code && !derivedCostCenterPurchaseHistoryResult.error
        ? derivedCostCenterPurchaseHistoryResult.data || []
        : purchaseExactCostCenter?.code && !purchaseExactCostCenterHistoryResult.error
          ? purchaseExactCostCenterHistoryResult.data || []
          : namePurchaseHistoryResult.data || [];
    const seenPurchaseLineIds = new Set<number>();
    const costCenterPurchaseHistory = purchaseHistoryRows.filter((row: any) => {
      if (seenPurchaseLineIds.has(row.id)) return false;
      seenPurchaseLineIds.add(row.id);
      return true;
    });
    const purchaseHistorySummary = {
      matchBasis: purchaseHistoryMatchBasis,
      purchaseLines: costCenterPurchaseHistory.length,
      pricedLines: costCenterPurchaseHistory.filter((row: any) => row.net_amount != null).length,
      unpricedLines: costCenterPurchaseHistory.filter((row: any) => row.net_amount == null).length,
      orders: new Set(costCenterPurchaseHistory.map((row: any) => row.order_number).filter(Boolean)).size,
      suppliers: new Set(costCenterPurchaseHistory.map((row: any) => row.supplier_name).filter(Boolean)).size,
      netSpend: costCenterPurchaseHistory.reduce(
        (sum: number, row: any) => row.net_amount != null ? sum + Number(row.net_amount) : sum,
        0,
      ),
      lastOrderDate: costCenterPurchaseHistory
        .map((row: any) => row.order_date)
        .filter(Boolean)
        .sort()
        .reverse()[0] || null,
      lastSupplier: costCenterPurchaseHistory[0]?.supplier_name || null,
    };

    const locationCandidates = [
      ...(planningResult.data || []).map((row: any) => row.mine_raw),
      ...(drillingHistoryResult.data || []).map((row: any) => row.site_raw),
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const normalizedLocations = new Map<string, string>();
    for (const candidate of locationCandidates) {
      const normalized = normalizeLocationEvidence(candidate);
      if (!normalized || normalized === 'NO REGISTRADO' || normalized === '#ERROR!') continue;
      if (!normalizedLocations.has(normalized)) normalizedLocations.set(normalized, candidate);
    }
    const evidenceLocation =
      normalizedLocations.size === 1
        ? [...normalizedLocations.values()][0]
        : null;

    const planningCriticalities = new Map<string, string>();
    for (const row of planningResult.data || []) {
      const raw = String(row.criticality_raw || '').trim();
      if (!raw || ['#ERROR!', 'N/A', 'NO REGISTRADO'].includes(raw.toUpperCase())) continue;
      const normalized = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
      if (!planningCriticalities.has(normalized)) planningCriticalities.set(normalized, raw);
    }
    const evidenceCriticality =
      planningCriticalities.size === 1
        ? [...planningCriticalities.values()][0]
        : null;

    const planningMeterUnits = Array.from(
      new Set(
        (planningResult.data || [])
          .map((row: any) => String(row.meter_unit || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    const planningMeterUnit = planningMeterUnits.length === 1 ? planningMeterUnits[0] : null;

    const planningEvidenceAt = (planningResult.data || [])
      .map((row: any) => row.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;
    const drillingLocationEvidenceAt = (drillingHistoryResult.data || [])
      .map((row: any) => row.operation_date)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    const operationalLocation = normalizeLocationEvidence(operationalStateResult.data?.location)
      ? String(operationalStateResult.data?.location || '').trim()
      : null;
    const payloadLocation = normalizeLocationEvidence(normalizedAsset.location)
      ? String(normalizedAsset.location || '').trim()
      : null;
    const operationalCriticality = cleanCategoricalEvidence(operationalStateResult.data?.criticality);
    const payloadCriticality = cleanCategoricalEvidence(normalizedAsset.criticality);
    const operationalStatus = cleanCategoricalEvidence(operationalStateResult.data?.operational_status);
    const latestStatusEvent = (statusHistoryResult.data || [])[0] || null;
    const eventStatus = cleanCategoricalEvidence(latestStatusEvent?.new_state);
    const payloadStatus = cleanCategoricalEvidence(
      sourcePayload.status || sourcePayload.operational_status,
    );
    const canonicalStatus = cleanCategoricalEvidence(canonicalCurrent?.operational_status);
    const resolvedOperationalStatus = operationalStatus || eventStatus || payloadStatus || canonicalStatus || null;
    const statusEventMatchesResolved =
      eventStatus &&
      resolvedOperationalStatus &&
      String(eventStatus).trim().toLowerCase() === String(resolvedOperationalStatus).trim().toLowerCase();
    const referenceFamily =
      normalizedAsset.asset_type || normalizedAsset.category
        ? null
        : exactCostCenter?.family || inferMachineFamilyFromText(String(normalizedAsset.name || ''));
    const referenceManufacturer =
      normalizedAsset.manufacturer ? null : inferManufacturerFromName(normalizedAsset.name);
    const inferredLicensePlate =
      normalizedAsset.license_plate ||
      !isRoadVehicleIdentity(
        normalizedAsset.asset_type,
        normalizedAsset.category,
        referenceFamily,
        normalizedAsset.name,
      )
        ? null
        : inferChileanPlateFromName(normalizedAsset.name);

    const resolvedAsset = {
      ...normalizedAsset,
      meter_unit: normalizedAsset.meter_unit || planningMeterUnit || null,
      cost_center_code:
        normalizedAsset.cost_center_code ||
        exactCostCenter?.code ||
        purchaseExactCostCenter?.code ||
        null,
      cost_center_name:
        exactCostCenterDetailResult.data?.name ||
        exactCostCenter?.name ||
        purchaseExactCostCenter?.description ||
        null,
      cost_center_evidence_source:
        normalizedAsset.cost_center_code
          ? 'maintenance_canonical_assets_v1'
          : exactCostCenter?.code
            ? 'cost_centers_exact_identity'
            : purchaseExactCostCenter?.code
              ? 'purchase_history_exact_identity'
              : null,
      location: operationalLocation || payloadLocation || evidenceLocation || null,
      location_evidence_source:
        operationalLocation
          ? 'asset_operational_state_v1'
          : payloadLocation
            ? 'maintenance_canonical_assets_v1'
            : evidenceLocation
              ? 'planning_or_production_evidence'
              : null,
      location_evidence_at:
        operationalLocation
          ? evidenceLocation && normalizeLocationEvidence(operationalLocation) === normalizeLocationEvidence(evidenceLocation)
            ? [planningEvidenceAt, drillingLocationEvidenceAt].filter(Boolean).sort().reverse()[0] || null
            : null
          : payloadLocation
            ? normalizedAsset.updated_at || normalizedAsset.imported_at || null
            : evidenceLocation
              ? [planningEvidenceAt, drillingLocationEvidenceAt].filter(Boolean).sort().reverse()[0] || null
              : null,
      criticality: operationalCriticality || payloadCriticality || evidenceCriticality || null,
      criticality_evidence_source:
        operationalCriticality
          ? 'asset_operational_state_v1'
          : payloadCriticality
            ? 'maintenance_canonical_assets_v1'
            : evidenceCriticality
              ? 'planning_maintenance_source_rows'
              : null,
      criticality_evidence_at:
        operationalCriticality
          ? evidenceCriticality &&
            normalizeCriticalityEvidence(operationalCriticality) === normalizeCriticalityEvidence(evidenceCriticality)
            ? planningEvidenceAt
            : null
          : payloadCriticality
            ? normalizedAsset.updated_at || normalizedAsset.imported_at || null
            : evidenceCriticality
              ? planningEvidenceAt
              : null,
      operational_status: resolvedOperationalStatus,
      operational_status_evidence_source:
        statusEventMatchesResolved
          ? 'maintenance_asset_status_history'
          : operationalStatus
            ? 'asset_operational_state_v1'
            : payloadStatus
              ? 'maintenance_canonical_assets_v1'
              : canonicalStatus
                ? 'canonical_assets_current'
                : null,
      operational_status_evidence_at:
        statusEventMatchesResolved
          ? latestStatusEvent?.changed_at || null
          : payloadStatus
            ? normalizedAsset.updated_at || normalizedAsset.imported_at || null
            : canonicalStatus
              ? canonicalCurrent?.updated_at || null
              : null,
      operational_status_reason:
        statusEventMatchesResolved ? latestStatusEvent?.reason || null : null,
      reference_manufacturer: referenceManufacturer || null,
      reference_manufacturer_evidence_source:
        referenceManufacturer ? 'deterministic_name_brand' : null,
      reference_manufacturer_evidence_at:
        referenceManufacturer ? normalizedAsset.updated_at || normalizedAsset.imported_at || null : null,
      reference_family: referenceFamily || null,
      reference_family_evidence_source:
        referenceFamily
          ? exactCostCenter?.family
            ? 'cost_center_family'
            : 'deterministic_name_classifier'
          : null,
      reference_family_evidence_at:
        referenceFamily ? normalizedAsset.updated_at || normalizedAsset.imported_at || null : null,
      license_plate: normalizedAsset.license_plate || inferredLicensePlate || null,
      license_plate_evidence_source:
        normalizedAsset.license_plate
          ? 'maintenance_canonical_assets_v1'
          : inferredLicensePlate
            ? 'deterministic_name_plate'
            : null,
      license_plate_evidence_at:
        normalizedAsset.license_plate || inferredLicensePlate
          ? normalizedAsset.updated_at || normalizedAsset.imported_at || null
          : null,
    };

    const rawPlanningMeterHistory = meterHistoryResult.data || [];
    const planningMeterSignature = (row: any) =>
      [row.canonical_asset_id || id, row.recorded_at || '', row.meter_value ?? '', row.meter_unit || ''].join('|');
    const planningMeterHistory = Array.from(
      rawPlanningMeterHistory.reduce((map: Map<string, any>, row: any) => {
        const signature = planningMeterSignature(row);
        if (!map.has(signature)) map.set(signature, row);
        return map;
      }, new Map()).values(),
    ).slice(0, 12);
    const duplicatePlanningMeterRows = Math.max(rawPlanningMeterHistory.length - planningMeterHistory.length, 0);
    const latestPlanningMeter = planningMeterHistory[0] || null;
    const chronologicalPlanningMeters = [...planningMeterHistory]
      .filter((row: any) => row.meter_value != null && row.recorded_at)
      .sort((a: any, b: any) => String(a.recorded_at).localeCompare(String(b.recorded_at)));
    let materialMeterDecreaseCount = 0;
    for (let index = 1; index < chronologicalPlanningMeters.length; index += 1) {
      const previous = Number(chronologicalPlanningMeters[index - 1]?.meter_value);
      const current = Number(chronologicalPlanningMeters[index]?.meter_value);
      if (Number.isFinite(previous) && Number.isFinite(current) && previous - current > 1) {
        materialMeterDecreaseCount += 1;
      }
    }
    const preventiveMeterValues = preventives
      .filter((row: any) => {
        const value = Number(row.effective_current_meter);
        if (!Number.isFinite(value)) return false;
        return !(value === 0 && String(row.meter_evidence_source || '').toLowerCase() === 'schedule_snapshot');
      })
      .map((row: any) => Number(row.effective_current_meter));
    const uniquePreventiveMeters = Array.from(new Set(preventiveMeterValues));
    const preventiveMeterSnapshot = uniquePreventiveMeters.length === 1 ? uniquePreventiveMeters[0] : null;
    const planningCurrentRows = (planningResult.data || []).filter(
      (row: any) => row.current_reading !== null && row.current_reading !== undefined && Number.isFinite(Number(row.current_reading)),
    );
    const uniquePlanningCurrentMeters = Array.from(
      new Set(planningCurrentRows.map((row: any) => Number(row.current_reading))),
    );
    const planningCurrentMeter = uniquePlanningCurrentMeters.length === 1 ? uniquePlanningCurrentMeters[0] : null;
    const planningCurrentEvidence = planningCurrentMeter != null
      ? planningCurrentRows
          .filter((row: any) => Number(row.current_reading) === planningCurrentMeter)
          .sort((a: any, b: any) => String(b.current_reading_at || b.updated_at || '').localeCompare(String(a.current_reading_at || a.updated_at || '')))[0] || null
      : null;
    const baseRuntimeCost = runtimeCostResult.data || null;
    const resolvedLatestMeter =
      baseRuntimeCost?.latest_meter_hours ??
      latestPlanningMeter?.meter_value ??
      planningCurrentMeter ??
      preventiveMeterSnapshot ??
      null;
    const resolvedLastReadingAt =
      baseRuntimeCost?.last_reading_at ??
      latestPlanningMeter?.recorded_at ??
      planningCurrentEvidence?.current_reading_at ??
      planningCurrentEvidence?.updated_at ??
      null;
    const resolvedMeterUnit =
      baseRuntimeCost?.latest_meter_hours != null
        ? 'h'
        : latestPlanningMeter?.meter_unit ||
          planningCurrentEvidence?.meter_unit ||
          normalizedAsset.meter_unit ||
          planningMeterUnit ||
          (preventiveMeterSnapshot != null ? 'h' : null);
    const resolvedMeterEvidenceSource =
      baseRuntimeCost?.latest_meter_hours != null
        ? 'asset_runtime_readings'
        : latestPlanningMeter?.meter_value != null
          ? latestPlanningMeter.source_kind || latestPlanningMeter.source_reference || 'planning_asset_meter_readings'
          : planningCurrentMeter != null
            ? 'planning_maintenance_source_rows'
            : preventiveMeterSnapshot != null
              ? (preventives.find((row: any) => Number(row.effective_current_meter) === preventiveMeterSnapshot)?.meter_evidence_source || 'schedule_snapshot')
              : null;
    const resolvedRuntimeCostIntelligence =
      resolvedLatestMeter != null || baseRuntimeCost
        ? {
            ...(baseRuntimeCost || {}),
            reading_count:
              Number(baseRuntimeCost?.reading_count || 0) > 0
                ? Number(baseRuntimeCost?.reading_count || 0)
                : planningMeterHistory.length > 0
                  ? planningMeterHistory.length
                  : planningCurrentMeter != null
                    ? 1
                    : preventiveMeterSnapshot != null
                      ? 1
                      : 0,
            first_reading_at:
              baseRuntimeCost?.first_reading_at ??
              (planningMeterHistory.length > 0 ? planningMeterHistory[planningMeterHistory.length - 1]?.recorded_at || null : null),
            last_reading_at: resolvedLastReadingAt,
            latest_meter_hours: resolvedLatestMeter,
            latest_meter_unit: resolvedMeterUnit,
            meter_evidence_source: resolvedMeterEvidenceSource,
            duplicate_meter_rows_ignored: duplicatePlanningMeterRows,
            material_meter_decrease_count: materialMeterDecreaseCount,
            meter_sequence_status:
              materialMeterDecreaseCount > 0 ? 'review_required' : 'consistent',
          }
        : null;

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
      generatedAt: new Date().toISOString(),
      asset: resolvedAsset,
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
      statusHistory: statusHistoryResult.data || [],
      maintenancePlanning: planningResult.data || [],
      operationalState: operationalStateResult.data || null,
      operatingSpine: operatingSpineResult.data || null,
      supplyChain: supplyChainResult.data || [],
      procurementOrders,
      costCenterPurchaseHistory,
      purchaseHistorySummary,
      economicHistory: economicHistoryResult.data || [],
      drillingHistory: drillingHistoryResult.data || [],
      drillEconomics: drillEconomicsResult.data || null,
      drillingMaintenanceReview: drillingReviewResult.data || [],
      maintenancePriority: maintenancePriorityResult.data || null,
      financeReconciliation: financeReconciliationResult.data || null,
      runtimeCostIntelligence: resolvedRuntimeCostIntelligence,
      meterHistory: planningMeterHistory,
      drillOperationalEvidence: drillEvidenceResult.data || null,
      drillEconomicsChange: drillEconomicsChangeResult.data || null,
      maintenanceTaskCandidates: taskCandidatesResult.data || [],
      standardJobPlans: standardPlanResult.data || [],
      identityHistory: identityHistoryResult.data || [],
      canEdit: access.canWrite,
      unavailableSources: sourceErrors.map((item) => item.source),
      evidence: {
        mtbf: 'Sólo desde intervalos correctivos auditados con horómetro válido.',
        mttr: 'Sólo desde horas reales de correctivos auditados.',
        cost: 'Sólo desde el último snapshot auditado de cada cierre de OT.',
        parts: 'Cantidades observadas en work_order_parts; no se infiere stock disponible.',
      },
    });
  } catch (error) {
    console.error('[asset-360] operational-360 failed', {
      assetId: id,
      message: error instanceof Error ? error.message : (error as { message?: string } | null)?.message || 'unknown',
      code: (error as { code?: string } | null)?.code || null,
      details: (error as { details?: string } | null)?.details || null,
      hint: (error as { hint?: string } | null)?.hint || null,
    });
    return NextResponse.json({ error: 'No se pudo cargar la Ficha 360 operacional' }, { status: 500 });
  }
}
