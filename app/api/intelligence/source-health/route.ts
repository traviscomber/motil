export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import { deriveSourceHealth, SOURCE_CONFIDENCE_POLICY, type SourceHealthInput } from '@/lib/intelligence/source-confidence';

export async function GET(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const org = context.organizationId;

  const inputs: SourceHealthInput[] = [];

  if (access.canRead('production')) {
    const { data, error } = await context.supabase
      .from('production_fine_flow_daily_v1')
      .select('operation_date,fine_coverage_state,flow_state')
      .eq('organization_id', org)
      .order('operation_date', { ascending: false })
      .limit(1);
    if (error) inputs.push({ source: 'production_fine_flow_daily_v1', domain: 'production', observedThrough: null, available: false });
    else {
      const row: any = data?.[0] || null;
      inputs.push({
        source: 'production_fine_flow_daily_v1', domain: 'production', observedThrough: row?.operation_date || null, available: Boolean(row),
        qualityHold: String(row?.fine_coverage_state || '').toUpperCase() === 'HOLD' || String(row?.flow_state || '').toUpperCase() === 'HOLD',
        incomplete: /partial|incomplete|missing/i.test(`${row?.fine_coverage_state || ''} ${row?.flow_state || ''}`),
      });
    }
  }

  if (access.canRead('maintenance')) {
    const { data, error } = await context.supabase.from('maintenance_work_orders').select('updated_at').eq('organization_id', org).order('updated_at', { ascending: false }).limit(1);
    inputs.push({ source: 'maintenance_work_orders', domain: 'maintenance', observedThrough: error ? null : (data?.[0]?.updated_at || null), available: !error && Boolean(data?.[0]) });
  }

  if (access.canRead('inventory')) {
    const { data, error } = await context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', org).order('snapshot_date', { ascending: false }).limit(1);
    inputs.push({ source: 'canonical_inventory_current', domain: 'inventory', observedThrough: error ? null : (data?.[0]?.snapshot_date || null), available: !error && Boolean(data?.[0]) });
  }

  if (access.canRead('procurement')) {
    const { data, error } = await context.supabase.from('canonical_purchase_orders_current').select('updated_at').eq('organization_id', org).order('updated_at', { ascending: false }).limit(1);
    inputs.push({ source: 'canonical_purchase_orders_current', domain: 'procurement', observedThrough: error ? null : (data?.[0]?.updated_at || null), available: !error && Boolean(data?.[0]) });
  }

  if (access.canRead('finance')) {
    const { data, error } = await context.supabase.from('canonical_finance_overview').select('last_event_at').eq('organization_id', org).order('last_event_at', { ascending: false }).limit(1);
    inputs.push({ source: 'canonical_finance_overview', domain: 'finance', observedThrough: error ? null : (data?.[0]?.last_event_at || null), available: !error && Boolean(data?.[0]) });
  }

  const sources = inputs.map((input) => deriveSourceHealth(input));
  return NextResponse.json({
    sources,
    coverage: { authorizedDomains: access.domains, measuredDomains: sources.map((row) => row.domain) },
    policy: SOURCE_CONFIDENCE_POLICY,
    operationalMutationExecuted: false,
    generatedAt: new Date().toISOString(),
  });
}
