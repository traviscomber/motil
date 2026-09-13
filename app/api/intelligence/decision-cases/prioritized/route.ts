export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { deriveDecisionAttention } from '@/lib/intelligence/decision-attention';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,summary,evidence_refs,uncertainty,contradictions,missing_evidence,recommended_human_action,authority,status,acknowledged_at,last_revalidated_at,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const domains = rows.flatMap((row: any) => [row.source_domain, row.target_domain]).filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  const visible = rows.filter((row: any) => accessible.has(row.source_domain) && accessible.has(row.target_domain));

  const cases = visible
    .map((row: any) => ({ ...row, attention: deriveDecisionAttention(row) }))
    .sort((a: any, b: any) => {
      if (b.attention.score !== a.attention.score) return b.attention.score - a.attention.score;
      const aTime = new Date(a.last_revalidated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.last_revalidated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

  return NextResponse.json({
    cases,
    hiddenByCurrentPermissions: rows.length - visible.length,
    scoring: {
      version: 'attention_v1',
      derived: true,
      persisted: false,
      policy: 'El nivel P1/P2/P3 se deriva sólo de evidencia visible, clase de bloqueo, contradicciones, evidencia faltante y frescura de revalidación. No reemplaza severidad operacional ni autoridad humana.',
    },
    authority: 'advisory_only',
  });
}
