import type { OrganizationSuccessContext } from '@/lib/api/organization-context';

export type EquipmentIntelligenceContext = {
  available: boolean;
  asset: Record<string, unknown> | null;
  operational: Record<string, unknown>;
  decisionCases: unknown[];
  sources: string[];
  promptContext: string;
  authority: 'canonical_operational_context';
  errorCode: string | null;
};

function normalized(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function resolveEquipmentMention(
  context: OrganizationSuccessContext,
  query: string,
) {
  const needle = normalized(query);
  if (!needle) return null;

  const result = await context.supabase
    .from('maintenance_canonical_assets_v1')
    .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,is_active,validation_status')
    .eq('organization_id', context.organizationId)
    .eq('is_active', true)
    .limit(500);
  if (result.error) throw result.error;

  const rows = result.data || [];
  const scored = rows.map((row: any) => {
    const code = normalized(row.asset_code);
    const serial = normalized(row.serial_number);
    const plate = normalized(row.license_plate);
    const name = normalized(row.name);
    let score = 0;
    if (code && needle.includes(code)) score = Math.max(score, 100);
    if (serial && needle.includes(serial)) score = Math.max(score, 100);
    if (plate && needle.includes(plate)) score = Math.max(score, 95);
    if (name && name.length >= 5 && needle.includes(name)) score = Math.max(score, 80);
    return { row, score };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].row;
}

export async function loadEquipmentIntelligenceContext(
  context: OrganizationSuccessContext,
  assetId: string,
): Promise<EquipmentIntelligenceContext> {
  try {
    const org = context.organizationId;
    const [assetResult, ordersResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult, partsResult, casesResult] = await Promise.all([
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,cost_center_code,is_active,validation_status')
        .eq('organization_id', org)
        .eq('id', assetId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_operational_work_order_flow_v1')
        .select('work_order_id,work_order_number,status,priority,work_type,scheduled_date,assigned_person_name,flow_status,open_purchase_order_count,quantity_requested,quantity_issued,quantity_installed,total_cost')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .neq('status', 'completed')
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .limit(30),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('schedule_id,task_name,priority,frequency_hours,due_meter,effective_current_meter,meter_evidence_source,hour_status,remaining_hours,alert_due,generated_work_order_id')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .eq('enabled', true)
        .limit(30),
      context.supabase
        .from('asset_runtime_summary_v1')
        .select('reading_count,last_reading_at,latest_meter_hours,observed_operating_hours,reset_count,usable_for_rate_metrics')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('audited_closures,recurring_cause_count,max_same_cause_occurrences,audited_total_cost,audited_avg_cost,total_actual_hours,total_downtime_hours,avg_days_between_audited_interventions,has_recurring_root_cause,last_audited_closure_at')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_runtime_reliability_by_asset_v1')
        .select('audited_corrective_events,corrective_events_with_meter,valid_mtbf_intervals,mtbf_operating_hours,mttr_hours,audited_corrective_cost,audited_downtime_hours,meter_event_coverage_percent,last_corrective_close_at')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .maybeSingle(),
      context.supabase
        .from('work_order_parts')
        .select('id,work_order_id,canonical_product_id,quantity_requested,quantity_reserved,quantity_issued,quantity_installed,quantity_returned,status,installed_at')
        .eq('organization_id', org)
        .eq('canonical_asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(80),
      context.supabase
        .from('motil_ai_decision_cases')
        .select('id,target_domain,title,summary,evidence_refs,missing_evidence,contradictions,recommended_human_action,status,created_at,updated_at,last_revalidated_at')
        .eq('organization_id', org)
        .eq('created_by_user_id', context.userId)
        .eq('target_domain', 'maintenance')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(80),
    ]);

    const failed = [assetResult, ordersResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult, partsResult, casesResult].find((result) => result.error);
    if (failed?.error) throw failed.error;
    if (!assetResult.data) {
      return { available: false, asset: null, operational: {}, decisionCases: [], sources: [], promptContext: '', authority: 'canonical_operational_context', errorCode: 'asset_not_found' };
    }

    const decisionCases = (casesResult.data || []).filter((row: any) => JSON.stringify(row.evidence_refs || []).includes(assetId));
    const parts = partsResult.data || [];
    const pendingParts = parts.filter((row: any) => Math.max(Number(row.quantity_requested || 0) - Number(row.quantity_installed || 0) - Number(row.quantity_returned || 0), 0) > 0);
    const installedParts = parts.filter((row: any) => Number(row.quantity_installed || 0) > 0);
    const coverage = {
      runtime: Boolean(runtimeResult.data),
      reliability: Boolean(reliabilityResult.data),
      runtimeReliability: Boolean(runtimeReliabilityResult.data),
      openWorkOrders: (ordersResult.data || []).length,
      preventives: (preventiveResult.data || []).length,
      observedPartLines: parts.length,
      decisionCases: decisionCases.length,
    };
    const operational = {
      coverage,
      openWorkOrders: ordersResult.data || [],
      preventives: preventiveResult.data || [],
      runtime: runtimeResult.data || null,
      reliability: reliabilityResult.data || null,
      runtimeReliability: runtimeReliabilityResult.data || null,
      parts: {
        observedLines: parts.length,
        installedLines: installedParts.length,
        pendingLines: pendingParts.length,
        recent: parts.slice(0, 30),
      },
    };
    const sources = [
      'maintenance_canonical_assets_v1',
      'maintenance_operational_work_order_flow_v1',
      'preventive_maintenance_hour_status_v1',
      'asset_runtime_summary_v1',
      'maintenance_reliability_by_asset_v1',
      'maintenance_runtime_reliability_by_asset_v1',
      'work_order_parts',
      'motil_ai_decision_cases',
    ];
    const promptContext = `EQUIPMENT INTELLIGENCE — EVIDENCIA OPERACIONAL CANÓNICA\n${JSON.stringify({ asset: assetResult.data, operational, decisionCases })}\nREGLAS: si coverage indica false o 0, declarar la ausencia de evidencia y no convertirla en un cero operacional; no inferir stock disponible desde work_order_parts; no llamar MTBF a horómetro; recurrencia observada no es predicción de falla; costos provienen sólo de fuentes auditadas cuando la vista lo indica; Decision Cases son advisory y deben revalidarse contra evidencia actual.`;

    return {
      available: true,
      asset: assetResult.data,
      operational,
      decisionCases,
      sources,
      promptContext,
      authority: 'canonical_operational_context',
      errorCode: null,
    };
  } catch {
    return { available: false, asset: null, operational: {}, decisionCases: [], sources: [], promptContext: '', authority: 'canonical_operational_context', errorCode: 'equipment_context_unavailable' };
  }
}
