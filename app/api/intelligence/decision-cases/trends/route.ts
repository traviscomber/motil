export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';
import { classifyDecisionCaseTrend, TEMPORAL_TREND_POLICY } from '@/lib/intelligence/temporal-decision-trends';

const MAX_WINDOW_HOURS = 30 * 24;

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedHours = Number.parseInt(request.nextUrl.searchParams.get('hours') || '168', 10);
  const hours = Number.isFinite(requestedHours) ? Math.min(MAX_WINDOW_HOURS, Math.max(1, requestedHours)) : 168;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await context.supabase
    .from('motil_ai_decision_case_events')
    .select('id,decision_case_id,source_domain,target_domain,event_kind,before_state,after_state,occurred_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .gt('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const domains = rows.flatMap((row: any) => [row.source_domain, row.target_domain]).filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  const visible = rows.filter((row: any) => accessible.has(row.source_domain) && accessible.has(row.target_domain));
  const trends = visible.map((row: any) => ({
    eventId: row.id,
    caseId: row.decision_case_id,
    sourceDomain: row.source_domain,
    targetDomain: row.target_domain,
    occurredAt: row.occurred_at,
    trend: classifyDecisionCaseTrend(row),
  }));

  return NextResponse.json({
    since,
    through: new Date().toISOString(),
    trends,
    counts: trends.reduce<Record<string, number>>((acc, row) => {
      acc[row.trend] = (acc[row.trend] || 0) + 1;
      return acc;
    }, {}),
    hiddenByCurrentPermissions: rows.length - visible.length,
    policy: TEMPORAL_TREND_POLICY,
    operationalMutationExecuted: false,
  });
}
