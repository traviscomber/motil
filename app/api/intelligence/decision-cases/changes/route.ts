export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';
import { deriveTemporalDecisionChanges, TEMPORAL_DECISION_POLICY } from '@/lib/intelligence/temporal-decision-changes';

const MAX_WINDOW_DAYS = 30;

function resolveSince(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('since');
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return null;
    const oldest = Date.now() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return new Date(Math.max(parsed.getTime(), oldest)).toISOString();
  }
  const hours = Number.parseInt(request.nextUrl.searchParams.get('hours') || '24', 10);
  const boundedHours = Number.isFinite(hours) ? Math.min(MAX_WINDOW_DAYS * 24, Math.max(1, hours)) : 24;
  return new Date(Date.now() - boundedHours * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const since = resolveSince(request);
  if (!since) return NextResponse.json({ error: 'Parámetro since inválido.' }, { status: 400 });

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,summary,status,recommended_human_action,created_at,updated_at,acknowledged_at,last_revalidated_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .or(`created_at.gt.${since},updated_at.gt.${since},acknowledged_at.gt.${since},last_revalidated_at.gt.${since}`)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const domains = rows.flatMap((row: any) => [row.source_domain, row.target_domain]).filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  const visible = rows.filter((row: any) => accessible.has(row.source_domain) && accessible.has(row.target_domain));
  const changes = deriveTemporalDecisionChanges(visible as any, since);

  return NextResponse.json({
    since,
    through: new Date().toISOString(),
    changes,
    counts: changes.reduce<Record<string, number>>((acc, row) => {
      acc[row.kind] = (acc[row.kind] || 0) + 1;
      return acc;
    }, {}),
    hiddenByCurrentPermissions: rows.length - visible.length,
    policy: TEMPORAL_DECISION_POLICY,
    operationalMutationExecuted: false,
  });
}
