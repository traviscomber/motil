// Orquestación de fuentes de datos de la ficha 360 operacional.
// Extraída verbatim de app/api/maintenance/assets/[id]/operational-360/route.ts;
// las consultas se mueven sin cambios para preservar el comportamiento exacto.

type Asset360QueryContext = {
  supabase: any;
  organizationId: string;
};

type Asset360QueryAsset = {
  cost_center_code?: string | null;
  name?: string | null;
  asset_type?: string | null;
};

const OPTIONAL_SOURCE_TIMEOUT_MS = 2500;
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

type Asset360SourceError = {
  source: string;
  code: string | null;
  message: string;
};

// Cada resultado conserva la forma cruda de PostgREST ({ data, error });
// los consumidores del route aplican su propio post-procesamiento.
type Asset360SourceResults = {
  [key: string]: any;
  sourceErrors: Asset360SourceError[];
};

export async function queryAsset360Sources(
  context: Asset360QueryContext,
  id: string,
  asset: Asset360QueryAsset,
  purchaseSelect: string,
): Promise<Asset360SourceResults> {
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

  return {
    ordersResult,
    closeResult,
    preventiveResult,
    runtimeResult,
    reliabilityResult,
    runtimeReliabilityResult,
    snapshotsResult,
    partsResult,
    eventsResult,
    statusHistoryResult,
    planningResult,
    operationalStateResult,
    operatingSpineResult,
    supplyChainResult,
    procurementOrdersResult,
    costCenterPurchaseHistoryResult,
    namePurchaseHistoryResult,
    economicHistoryResult,
    drillingHistoryResult,
    drillEconomicsResult,
    drillingReviewResult,
    maintenancePriorityResult,
    financeReconciliationResult,
    runtimeCostResult,
    meterHistoryResult,
    drillEvidenceResult,
    drillEconomicsChangeResult,
    taskCandidatesResult,
    standardPlanResult,
    identityHistoryResult,
    exactCostCenterDetailResult,
    costCenterMatchResult,
    sourceErrors,
  };
}
