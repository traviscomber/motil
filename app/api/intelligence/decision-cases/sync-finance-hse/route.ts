export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { canAccessDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

type Candidate = {
  decisionKey: string;
  targetDomain: 'finance' | 'hse';
  title: string;
  summary: string;
  evidenceRefs: Record<string, unknown>[];
  uncertainty: string | null;
  contradictions: string[];
  missingEvidence: string[];
  recommendedHumanAction: string;
};

type ExistingCase = {
  id: string;
  evidence_refs: unknown;
};

function keyFromRefs(refs: unknown): string | null {
  if (!Array.isArray(refs)) return null;
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).decisionKey === 'string') return (ref as any).decisionKey;
  }
  return null;
}

async function financeCandidates(db: any, organizationId: string): Promise<Candidate[]> {
  const { data, error } = await db
    .from('maintenance_work_orders')
    .select('id,work_order_number,title,status,priority,scheduled_date,cost_center_id')
    .eq('organization_id', organizationId)
    .is('cost_center_id', null)
    .not('status', 'in', '(completed,closed,cancelled,canceled)')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(30);
  if (error) throw error;

  return (data || []).map((row: any) => {
    const decisionKey = `operational:finance:work-order-cost-center:${row.id}`;
    return {
      decisionKey,
      targetDomain: 'finance' as const,
      title: `${row.work_order_number || 'OT'} · centro de costo pendiente`,
      summary: `${row.title || 'Orden de trabajo'} está ${row.status || 'sin estado'} y no tiene centro de costo asociado. Prioridad operacional informada: ${row.priority || 'sin prioridad'}.`,
      evidenceRefs: [{ source: 'maintenance_work_orders', decisionKey, workOrderId: row.id, mode: 'read' }],
      uncertainty: 'La ausencia de centro de costo impide una atribución financiera completa, pero no demuestra por sí sola un costo incorrecto ni una falla de ejecución.',
      contradictions: [],
      missingEvidence: ['Falta centro de costo asociado a la OT.'],
      recommendedHumanAction: 'Validar la imputación financiera correcta y asignar el centro de costo desde el flujo autorizado antes del cierre contable de la OT.',
    };
  });
}

async function hseCandidates(db: any, organizationId: string): Promise<Candidate[]> {
  const countResult = await db
    .from('hse_commitments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .ilike('status', 'Pendiente')
    .is('due_date', null);
  if (countResult.error) throw countResult.error;
  const count = Number(countResult.count || 0);
  if (count === 0) return [];

  const decisionKey = 'operational:hse:commitments-without-due-date';
  return [{
    decisionKey,
    targetDomain: 'hse',
    title: 'HSE · compromisos pendientes sin fecha gobernable',
    summary: `Existen ${count} compromiso(s) HSE en estado Pendiente sin fecha de vencimiento registrada. MOTIL no los clasifica como vencidos porque la fuente no permite sostener esa conclusión.`,
    evidenceRefs: [{ source: 'hse_commitments', decisionKey, pendingWithoutDueDate: count, mode: 'read' }],
    uncertainty: 'Sin due_date no es posible calcular atraso, urgencia temporal ni incumplimiento. El caso representa una brecha de gobernanza del compromiso, no una infracción.',
    contradictions: [],
    missingEvidence: ['Falta fecha de vencimiento para compromisos HSE pendientes.'],
    recommendedHumanAction: 'Revisar los compromisos pendientes y registrar una fecha de cumplimiento sólo cuando exista respaldo operacional o documental para hacerlo.',
  }];
}

async function isResolved(db: any, organizationId: string, decisionKey: string): Promise<boolean> {
  if (decisionKey.startsWith('operational:finance:work-order-cost-center:')) {
    const workOrderId = decisionKey.replace('operational:finance:work-order-cost-center:', '');
    const { data, error } = await db
      .from('maintenance_work_orders')
      .select('cost_center_id,status')
      .eq('organization_id', organizationId)
      .eq('id', workOrderId)
      .maybeSingle();
    if (error) throw error;
    return !data || Boolean(data.cost_center_id) || ['completed', 'closed', 'cancelled', 'canceled'].includes(String(data.status || '').toLowerCase());
  }

  if (decisionKey === 'operational:hse:commitments-without-due-date') {
    const result = await db
      .from('hse_commitments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .ilike('status', 'Pendiente')
      .is('due_date', null);
    if (result.error) throw result.error;
    return Number(result.count || 0) === 0;
  }

  return false;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const executiveAllowed = await canAccessDecisionCaseDomain(request, 'executive');
  if (!executiveAllowed) return NextResponse.json({ error: 'No tienes acceso al contexto ejecutivo requerido para sincronizar casos.' }, { status: 403 });

  const [financeAllowed, hseAllowed, maintenanceAllowed] = await Promise.all([
    canAccessDecisionCaseDomain(request, 'finance'),
    canAccessDecisionCaseDomain(request, 'hse'),
    canAccessDecisionCaseDomain(request, 'maintenance'),
  ]);

  try {
    const candidateGroups = await Promise.all([
      financeAllowed && maintenanceAllowed ? financeCandidates(context.supabase, context.organizationId) : Promise.resolve([]),
      hseAllowed ? hseCandidates(context.supabase, context.organizationId) : Promise.resolve([]),
    ]);
    const candidates = candidateGroups.flat();
    const authorizedDomains = [
      financeAllowed && maintenanceAllowed ? 'finance' : null,
      hseAllowed ? 'hse' : null,
    ].filter((value): value is 'finance' | 'hse' => Boolean(value));
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = authorizedDomains.length
      ? await context.supabase
          .from('motil_ai_decision_cases')
          .select('id,evidence_refs')
          .eq('organization_id', context.organizationId)
          .eq('created_by_user_id', context.userId)
          .eq('source_domain', 'executive')
          .in('target_domain', authorizedDomains)
          .in('status', ['open', 'acknowledged'])
      : { data: [], error: null };
    if (existingError) throw existingError;

    const existingByKey = new Map<string, ExistingCase>();
    for (const row of (existing || []) as ExistingCase[]) {
      const key = keyFromRefs(row.evidence_refs);
      if (key) existingByKey.set(key, row);
    }

    let created = 0;
    let revalidated = 0;
    let archived = 0;
    const activeKeys = new Set(candidates.map((candidate) => candidate.decisionKey));

    for (const candidate of candidates) {
      const current = existingByKey.get(candidate.decisionKey);
      const payload = {
        title: candidate.title,
        summary: candidate.summary,
        evidence_refs: candidate.evidenceRefs,
        uncertainty: candidate.uncertainty,
        contradictions: candidate.contradictions,
        missing_evidence: candidate.missingEvidence,
        recommended_human_action: candidate.recommendedHumanAction,
        authority: 'advisory_only',
        updated_at: now,
        last_revalidated_at: now,
        last_revalidated_by_user_id: context.userId,
        last_revalidation_evidence_refs: candidate.evidenceRefs,
      };

      if (current) {
        const { error } = await context.supabase
          .from('motil_ai_decision_cases')
          .update(payload)
          .eq('id', current.id)
          .eq('organization_id', context.organizationId)
          .eq('created_by_user_id', context.userId);
        if (error) throw error;
        revalidated += 1;
      } else {
        const { error } = await context.supabase.from('motil_ai_decision_cases').insert({
          organization_id: context.organizationId,
          created_by_user_id: context.userId,
          source_domain: 'executive',
          target_domain: candidate.targetDomain,
          source_conversation_id: null,
          source_message_id: null,
          recommended_workflow_key: null,
          status: 'open',
          ...payload,
        });
        if (error) throw error;
        created += 1;
      }
    }

    for (const [decisionKey, row] of existingByKey.entries()) {
      if (activeKeys.has(decisionKey)) continue;
      if (!(await isResolved(context.supabase, context.organizationId, decisionKey))) continue;
      const { error } = await context.supabase
        .from('motil_ai_decision_cases')
        .update({ status: 'archived', updated_at: now, last_revalidated_at: now, last_revalidated_by_user_id: context.userId })
        .eq('id', row.id)
        .eq('organization_id', context.organizationId)
        .eq('created_by_user_id', context.userId);
      if (error) throw error;
      archived += 1;
    }

    return NextResponse.json({
      synced: true,
      created,
      revalidated,
      archived,
      active: candidates.length,
      coverage: { finance: financeAllowed && maintenanceAllowed, hse: hseAllowed },
      authority: 'advisory_only',
      policy: 'Sólo materializa brechas financieras/HSE respaldadas por evidencia tenant-scoped. No asigna centros de costo, no modifica compromisos HSE y no infiere vencimientos sin due_date.',
    });
  } catch (error) {
    console.error('[finance-hse-decision-sync] failed', { detail: error instanceof Error ? error.message : String(error ?? 'unknown') });
    return NextResponse.json({ error: 'No fue posible sincronizar los casos de Finanzas/HSE.' }, { status: 500 });
  }
}
