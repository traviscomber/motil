export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { filterAccessibleDecisionCaseDomains, isDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

function cleanComment(value: unknown) {
  if (typeof value !== 'string') return null;
  const comment = value.trim();
  return comment ? comment.slice(0, 2000) : null;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const caseId = typeof body?.caseId === 'string' ? body.caseId.trim() : '';
  const action = body?.action === 'acknowledge' || body?.action === 'archive' ? body.action : null;
  if (!caseId || !action) {
    return NextResponse.json({ error: 'caseId y action válido son requeridos.' }, { status: 400 });
  }

  const current = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,status')
    .eq('id', caseId)
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: 'Decision Case no encontrado.' }, { status: 404 });

  const domains = [current.data.source_domain, current.data.target_domain].filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  if (!accessible.has(current.data.source_domain) || !accessible.has(current.data.target_domain)) {
    return NextResponse.json({ error: 'Sin acceso actual al origen o destino del caso.' }, { status: 403 });
  }

  const result = await context.supabase.rpc('apply_motil_decision_human_action', {
    p_organization_id: context.organizationId,
    p_user_id: context.userId,
    p_case_id: caseId,
    p_action: action,
    p_comment: cleanComment(body?.comment),
  });

  if (result.error) {
    const message = String(result.error.message || '');
    if (message.includes('decision_case_not_found')) return NextResponse.json({ error: 'Decision Case no encontrado.' }, { status: 404 });
    if (message.includes('invalid_decision_transition')) return NextResponse.json({ error: 'La transición solicitada no es válida para el estado actual.' }, { status: 409 });
    if (message.includes('decision_comment_too_long')) return NextResponse.json({ error: 'El comentario excede el máximo permitido.' }, { status: 400 });
    return NextResponse.json({ error: 'No fue posible registrar la decisión humana.' }, { status: 500 });
  }

  return NextResponse.json({
    ...result.data,
    authority: 'human_action',
    operationalMutationExecuted: false,
    policy: 'La acción cambia sólo el lifecycle advisory del Decision Case y persiste actor, comentario y snapshot de evidencia; no ejecuta la recomendación operacional.',
  });
}
