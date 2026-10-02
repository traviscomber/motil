export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSupabaseAdmin } from '@/lib/db/supabase';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const canonicalDb = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - 89 * DAY_MS).toISOString().slice(0, 10);
  const probes = [
    ['drilling_maintenance_review_queue_v1', canonicalDb.from('drilling_maintenance_review_queue_v1').select('review_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,has_linked_work_order').eq('organization_id', context.organizationId).limit(1)],
    ['production_drilling_source_reports', canonicalDb.from('production_drilling_source_reports').select('canonical_asset_id,operation_date,equipment_status_raw,equipment_without_crew_raw,power_outage_raw,water_shortage_raw').eq('organization_id', context.organizationId).gte('operation_date', windowStart).not('canonical_asset_id', 'is', null).limit(1)],
    ['preventive_maintenance_hour_status_v1', canonicalDb.from('preventive_maintenance_hour_status_v1').select('schedule_id,canonical_asset_id,asset_code,asset_name,task_name,frequency_hours,effective_current_meter,due_meter,meter_evidence_source,meter_basis_conflict,hour_status,remaining_hours,generated_work_order_id').eq('organization_id', context.organizationId).limit(1)],
    ['maintenance_work_orders', canonicalDb.from('maintenance_work_orders').select('id,work_order_number,canonical_asset_id,title,description,work_type,status,priority,scheduled_date,completion_date,actual_duration_hours,down_time_hours,root_cause,preventive_actions,external_cost,created_by').eq('organization_id', context.organizationId).not('created_by', 'is', null).limit(1)],
    ['maintenance_reliability_base_v1', canonicalDb.from('maintenance_reliability_base_v1').select('work_order_id,canonical_asset_id,asset_code,asset_name,root_cause,root_cause_key,work_type,actual_duration_hours,down_time_hours,total_cost,closed_at').eq('organization_id', context.organizationId).limit(1)],
    ['work_order_close_readiness_v2', canonicalDb.from('work_order_close_readiness_v2').select('work_order_id,work_order_number,canonical_asset_id,title,ready_to_close,next_action,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,external_cost_conflict,standard_plan_steps_pending').eq('organization_id', context.organizationId).limit(1)],
    ['maintenance_canonical_assets_v1', canonicalDb.from('maintenance_canonical_assets_v1').select('id,asset_code,name,asset_type,category,manufacturer,model,cost_center_code,is_active,validation_status').eq('organization_id', context.organizationId).limit(1)],
  ] as const;

  const sourceResults = await Promise.all(probes.map(async ([source, query]) => {
    const result = await query;
    return {
      source,
      ok: !result.error,
      error: result.error?.message || null,
      rows: result.data?.length || 0,
    };
  }));

  const apiKey = process.env.OPENAI_API_KEY;
  let openai: Record<string, unknown> = { ok: false, error: 'OPENAI_API_KEY missing' };
  if (apiKey) {
    const configuredModel = process.env.OPENAI_MAINTENANCE_MODEL?.trim();
    const models = Array.from(new Set([configuredModel, 'gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna'].filter(Boolean))) as string[];
    let lastError: string | null = null;
    for (const model of models) {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: 'Reply exactly: OK', reasoning: { effort: 'none' }, max_output_tokens: 64 }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        openai = { ok: true, model: payload?.model || model, responseId: payload?.id || null };
        break;
      }
      lastError = payload?.error?.message || `OpenAI responded ${response.status}`;
    }
    if (!openai.ok) openai = { ok: false, error: lastError };
  }

  const canonicalFallback = { ok: sourceResults.every((item) => item.ok), mode: 'canonical_fallback' };
  const ok = canonicalFallback.ok && (openai.ok === true || canonicalFallback.ok);
  const degraded = openai.ok !== true;
  return NextResponse.json({ ok, degraded, sourceResults, openai, canonicalFallback }, { status: ok ? 200 : 503 });
}
