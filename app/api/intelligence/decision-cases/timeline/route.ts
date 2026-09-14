export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';
import {
  DECISION_TIMELINE_POLICY,
  deriveDecisionCaseTimeline,
  type DecisionHumanActionRow,
} from '@/lib/intelligence/decision-case-timeline';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const caseId = request.nextUrl.searchParams.get('caseId')?.trim();
  if (!caseId) return NextResponse.json({ error: 'caseId es obligatorio.' }, { status: 400 });

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,status,created_by_user_id,acknowledged_by_user_id,last_revalidated_by_user_id,created_at,acknowledged_at,last_revalidated_at,updated_at,recommended_human_action,last_revalidation_evidence_refs')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .eq('id', caseId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Decision Case no encontrado.' }, { status: 404 });

  const domains = [data.source_domain, data.target_domain].filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  if (!accessible.has(data.source_domain) || !accessible.has(data.target_domain)) {
    return NextResponse.json({ error: 'Sin acceso al dominio del caso.' }, { status: 403 });
  }

  const actionsResult = await context.supabase
    .from('motil_ai_decision_human_actions')
    .select('id,actor_user_id,action_kind,from_status,to_status,comment,recommendation_snapshot,evidence_refs_snapshot,missing_evidence_snapshot,contradictions_snapshot,created_at')
    .eq('organization_id', context.organizationId)
    .eq('decision_case_id', caseId)
    .order('created_at', { ascending: true });
  if (actionsResult.error) {
    return NextResponse.json({ error: 'No fue posible cargar el historial humano del caso.' }, { status: 500 });
  }

  const humanActions = (actionsResult.data || []) as DecisionHumanActionRow[];
  return NextResponse.json({
    case: { id: data.id, title: data.title, status: data.status, recommendedHumanAction: data.recommended_human_action },
    timeline: deriveDecisionCaseTimeline(data as any, humanActions),
    humanActionCount: humanActions.length,
    policy: DECISION_TIMELINE_POLICY,
    operationalMutationExecuted: false,
  });
}
