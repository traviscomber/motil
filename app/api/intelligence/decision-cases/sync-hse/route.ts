export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { canAccessDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

const DECISION_KEY = 'operational:hse:commitments-without-due-date';

function keyFromRefs(refs: unknown): string | null {
  if (!Array.isArray(refs)) return null;
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).decisionKey === 'string') return (ref as any).decisionKey;
  }
  return null;
}

async function pendingWithoutDueDate(db: any, organizationId: string) {
  const result = await db
    .from('hse_commitments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .ilike('status', 'Pendiente')
    .is('due_date', null);
  if (result.error) throw result.error;
  return Number(result.count || 0);
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const executiveAllowed = await canAccessDecisionCaseDomain(request, 'executive');
  if (!executiveAllowed) return NextResponse.json({ error: 'No tienes acceso al contexto ejecutivo requerido para sincronizar casos.' }, { status: 403 });

  const hseAllowed = await canAccessDecisionCaseDomain(request, 'hse');
  if (!hseAllowed) {
    return NextResponse.json({ synced: true, created: 0, revalidated: 0, archived: 0, active: 0, coverage: { hse: false }, authority: 'advisory_only' });
  }

  try {
    const count = await pendingWithoutDueDate(context.supabase, context.organizationId);
    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await context.supabase
      .from('motil_ai_decision_cases')
      .select('id,status,evidence_refs')
      .eq('organization_id', context.organizationId)
      .eq('created_by_user_id', context.userId)
      .eq('source_domain', 'executive')
      .eq('target_domain', 'hse')
      .in('status', ['open', 'acknowledged']);
    if (existingError) throw existingError;

    const current = (existing || []).find((row: any) => keyFromRefs(row.evidence_refs) === DECISION_KEY) || null;
    let created = 0;
    let revalidated = 0;
    let archived = 0;

    if (count > 0) {
      const evidenceRefs = [{ source: 'hse_commitments', decisionKey: DECISION_KEY, pendingWithoutDueDate: count, mode: 'read' }];
      const payload = {
        title: 'HSE · compromisos pendientes sin fecha gobernable',
        summary: `Existen ${count} compromiso(s) HSE en estado Pendiente sin fecha de vencimiento registrada. MOTIL no los clasifica como vencidos porque la fuente no permite sostener esa conclusión.`,
        evidence_refs: evidenceRefs,
        uncertainty: 'Sin due_date no es posible calcular atraso, urgencia temporal ni incumplimiento. El caso representa una brecha de gobernanza del compromiso, no una infracción.',
        contradictions: [],
        missing_evidence: ['Falta fecha de vencimiento para compromisos HSE pendientes.'],
        recommended_human_action: 'Revisar los compromisos pendientes y registrar una fecha de cumplimiento sólo cuando exista respaldo operacional o documental para hacerlo.',
        authority: 'advisory_only',
        updated_at: now,
        last_revalidated_at: now,
        last_revalidated_by_user_id: context.userId,
        last_revalidation_evidence_refs: evidenceRefs,
      };

      if (current) {
        const { error } = await context.supabase
          .from('motil_ai_decision_cases')
          .update(payload)
          .eq('id', current.id)
          .eq('organization_id', context.organizationId)
          .eq('created_by_user_id', context.userId);
        if (error) throw error;
        revalidated = 1;
      } else {
        const { error } = await context.supabase.from('motil_ai_decision_cases').insert({
          organization_id: context.organizationId,
          created_by_user_id: context.userId,
          source_domain: 'executive',
          target_domain: 'hse',
          source_conversation_id: null,
          source_message_id: null,
          recommended_workflow_key: null,
          status: 'open',
          ...payload,
        });
        if (error) throw error;
        created = 1;
      }
    } else if (current) {
      const { error } = await context.supabase
        .from('motil_ai_decision_cases')
        .update({ status: 'archived', updated_at: now, last_revalidated_at: now, last_revalidated_by_user_id: context.userId })
        .eq('id', current.id)
        .eq('organization_id', context.organizationId)
        .eq('created_by_user_id', context.userId);
      if (error) throw error;
      archived = 1;
    }

    return NextResponse.json({
      synced: true,
      created,
      revalidated,
      archived,
      active: count > 0 ? 1 : 0,
      coverage: { hse: true },
      authority: 'advisory_only',
      policy: 'HSE se materializa sólo desde hse_commitments tenant-scoped. No modifica compromisos y no infiere vencimiento, urgencia o incumplimiento cuando due_date está ausente.',
    });
  } catch (error) {
    console.error('[hse-decision-sync] failed', { detail: error instanceof Error ? error.message : String(error ?? 'unknown') });
    return NextResponse.json({ error: 'No fue posible sincronizar los casos HSE.' }, { status: 500 });
  }
}
