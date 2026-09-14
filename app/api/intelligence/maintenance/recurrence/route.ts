export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [causes, runtime] = await Promise.all([
    context.supabase
      .from('maintenance_reliability_by_root_cause_v1')
      .select('canonical_asset_id,asset_code,asset_name,root_cause_key,root_cause,occurrences,audited_total_cost,total_actual_hours,total_downtime_hours,first_seen_at,last_seen_at,is_recurring')
      .eq('organization_id', context.organizationId)
      .eq('is_recurring', true)
      .order('occurrences', { ascending: false })
      .limit(100),
    context.supabase
      .from('maintenance_runtime_reliability_by_asset_v1')
      .select('canonical_asset_id,audited_corrective_events,corrective_events_with_meter,valid_mtbf_intervals,mtbf_operating_hours,mttr_hours,meter_event_coverage_percent,last_corrective_close_at')
      .eq('organization_id', context.organizationId),
  ]);

  const error = causes.error || runtime.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const runtimeByAsset = new Map((runtime.data || []).map((row: any) => [row.canonical_asset_id, row]));
  const recurrence = (causes.data || []).map((row: any) => ({
    ...row,
    runtime: runtimeByAsset.get(row.canonical_asset_id) || null,
    advisory: {
      kind: 'possible_recurrence',
      basis: 'same_asset_same_audited_root_cause_at_least_twice',
      humanAction: 'Revisar evidencia de causa raíz y definir si corresponde una acción preventiva o análisis RCA.',
    },
  }));

  return NextResponse.json({
    recurrence,
    count: recurrence.length,
    policy: {
      authority: 'advisory_only',
      evidence: 'Sólo usa causas raíz de cierres auditados y métricas runtime que ya cumplen sus propios gates de evidencia.',
      boundary: 'Recurrencia observada no equivale a causa raíz definitiva, probabilidad futura ni riesgo calculado.',
      mtbf: 'MTBF sólo se expone cuando la vista canónica reporta intervalos válidos de horómetro.',
    },
    operationalMutationExecuted: false,
    source: 'maintenance_reliability_by_root_cause_v1+maintenance_runtime_reliability_by_asset_v1',
  });
}
