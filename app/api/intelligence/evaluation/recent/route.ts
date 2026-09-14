export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import { CORE_EVALUATION_POLICY, CORE_EVALUATION_SCENARIOS } from '@/lib/intelligence/core-evaluation';

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export async function GET(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedHours = Number(request.nextUrl.searchParams.get('hours') || 24);
  const hours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.round(requestedHours), 1), 168) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const result = await context.supabase
    .from('motil_ai_core_runs')
    .select('id,domain,specialist,source_count,tool_count,latency_ms,model,response_char_count,evaluation_state,created_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (result.error) {
    return NextResponse.json({ error: 'No fue posible cargar observabilidad del Intelligence Core.' }, { status: 500 });
  }

  const runs = result.data || [];
  const latencies = runs.map((run) => Number(run.latency_ms)).filter(Number.isFinite);
  const withSources = runs.filter((run) => Number(run.source_count || 0) > 0).length;
  const withTools = runs.filter((run) => Number(run.tool_count || 0) > 0).length;
  const specialists = runs.reduce<Record<string, number>>((acc, run) => {
    const key = String(run.specialist || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const evaluationStates = runs.reduce<Record<string, number>>((acc, run) => {
    const key = String(run.evaluation_state || 'not_evaluated');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    windowHours: hours,
    runCount: runs.length,
    structuralObservability: {
      sourceTraceCoverage: runs.length ? withSources / runs.length : null,
      toolTraceCoverage: runs.length ? withTools / runs.length : null,
      medianLatencyMs: median(latencies),
      latencySampleCount: latencies.length,
      specialists,
      evaluationStates,
    },
    scenarios: CORE_EVALUATION_SCENARIOS,
    policy: CORE_EVALUATION_POLICY,
    runs,
    operationalMutationExecuted: false,
    authority: 'structural_observability_only',
  });
}
