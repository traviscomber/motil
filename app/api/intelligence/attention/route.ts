export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';
import { assessOperationalAttention } from '@/lib/intelligence/operational-attention-score';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,summary,evidence_refs,uncertainty,contradictions,missing_evidence,recommended_human_action,status,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .in('status', ['open', 'acknowledged'])
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const domains = rows.flatMap((row: any) => [row.source_domain, row.target_domain]).filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  const visible = rows.filter((row: any) => accessible.has(row.source_domain) && accessible.has(row.target_domain));

  const ranked = visible
    .map((row: any) => ({ ...row, attention: assessOperationalAttention(row) }))
    .sort((a: any, b: any) => b.attention.score - a.attention.score || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 7);
  const limit = Number.isFinite(requestedLimit) ? Math.min(20, Math.max(1, Math.floor(requestedLimit))) : 7;

  return NextResponse.json({
    priorities: ranked.slice(0, limit),
    totalVisible: ranked.length,
    hiddenByCurrentPermissions: rows.length - visible.length,
    policy: 'Operational Attention Score es determinístico y advisory. Factores sin evidencia aportan 0; el orden no sustituye criterio humano ni verdad operacional.',
  });
}
