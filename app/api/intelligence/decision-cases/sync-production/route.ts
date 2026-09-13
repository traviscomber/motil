export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { canAccessDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

type SourceException = {
  domain: string | null;
  exception_type: string | null;
  event_date: string | null;
  reference_code: string | null;
  description: string | null;
  source_file: string | null;
  source_sheet: string | null;
  source_row: number | null;
};

type ExistingCase = {
  id: string;
  status: 'open' | 'acknowledged';
  evidence_refs: unknown;
};

type ProductionCandidate = {
  decisionKey: string;
  title: string;
  summary: string;
  evidenceRefs: Record<string, unknown>[];
  missingEvidence: string[];
  recommendedHumanAction: string;
};

const keyFromRefs = (refs: unknown): string | null => {
  if (!Array.isArray(refs)) return null;
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).decisionKey === 'string') return (ref as any).decisionKey;
  }
  return null;
};

const productionDomains = new Set(['drilling', 'fine_copper', 'concentrate_dispatch']);

function buildCandidates(rows: SourceException[]): ProductionCandidate[] {
  const grouped = new Map<string, SourceException[]>();
  for (const row of rows) {
    const domain = String(row.domain || '').trim();
    const exceptionType = String(row.exception_type || '').trim();
    if (!productionDomains.has(domain) || !exceptionType) continue;
    const key = `${domain}:${exceptionType}`;
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([groupKey, group]) => {
    const [domain, exceptionType] = groupKey.split(':', 2);
    const dated = group.map((row) => row.event_date).filter((value): value is string => Boolean(value)).sort();
    const latestDate = dated.at(-1) || null;
    const refs = group.slice(0, 8).map((row) => ({
      source: 'production_source_fidelity_exceptions_v1',
      referenceCode: row.reference_code,
      sourceFile: row.source_file,
      sourceSheet: row.source_sheet,
      sourceRow: row.source_row,
      eventDate: row.event_date,
      description: row.description,
      mode: 'read',
    }));
    const decisionKey = `operational:production:source-fidelity:${domain}:${exceptionType}`;
    refs.unshift({ source: 'production_source_fidelity_exceptions_v1', decisionKey, mode: 'read' });

    const domainLabel = domain === 'drilling' ? 'Perforación' : domain === 'fine_copper' ? 'Cobre fino' : 'Despachos de concentrado';
    const action = exceptionType === 'missing_hole_code'
      ? 'Corregir o completar el código de pozo en la fuente antes de intentar vincular estas filas a un sondaje operacional.'
      : exceptionType === 'hole_without_valid_mine'
        ? 'Validar la mina fuente de los pozos afectados. No inferir ubicación mientras la fuente no entregue una única mina válida.'
        : exceptionType === 'no_assay'
          ? 'Completar o validar el ensayo faltante. No estimar fino recuperado mientras la fuente no permita un cálculo determinístico.'
          : exceptionType === 'shipment_review'
            ? 'Revisar el despacho marcado por información fuente incompleta antes de tratarlo como cerrado o reconciliado.'
            : 'Revisar la excepción en su fuente y completar la evidencia faltante antes de usarla para una conclusión operacional.';

    return {
      decisionKey,
      title: `${domainLabel} · fidelidad de fuente`,
      summary: `${group.length} excepción(es) del tipo “${exceptionType}” permanecen en la fuente canónica${latestDate ? `; la más reciente es ${latestDate}` : ''}. MOTIL preserva la excepción y no rellena ni infiere el dato ausente.`,
      evidenceRefs: refs,
      missingEvidence: [group[0]?.description || `Falta resolver la excepción ${exceptionType} en la fuente.`],
      recommendedHumanAction: action,
    };
  });
}

async function isResolved(db: any, organizationId: string, decisionKey: string) {
  const prefix = 'operational:production:source-fidelity:';
  if (!decisionKey.startsWith(prefix)) return false;
  const remainder = decisionKey.slice(prefix.length);
  const separator = remainder.indexOf(':');
  if (separator <= 0) return false;
  const domain = remainder.slice(0, separator);
  const exceptionType = remainder.slice(separator + 1);
  const { data, error } = await db
    .from('production_source_fidelity_exceptions_v1')
    .select('domain')
    .eq('organization_id', organizationId)
    .eq('domain', domain)
    .eq('exception_type', exceptionType)
    .limit(1);
  if (error) throw error;
  return !data?.length;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const executiveAllowed = await canAccessDecisionCaseDomain(request, 'executive');
  if (!executiveAllowed) return NextResponse.json({ error: 'No tienes acceso al contexto ejecutivo requerido para sincronizar casos.' }, { status: 403 });
  const productionAllowed = await canAccessDecisionCaseDomain(request, 'production');
  if (!productionAllowed) {
    return NextResponse.json({ synced: true, created: 0, revalidated: 0, archived: 0, active: 0, coverage: { production: false }, authority: 'advisory_only' });
  }

  try {
    const { data, error } = await context.supabase
      .from('production_source_fidelity_exceptions_v1')
      .select('domain,exception_type,event_date,reference_code,description,source_file,source_sheet,source_row')
      .eq('organization_id', context.organizationId)
      .in('domain', Array.from(productionDomains))
      .limit(500);
    if (error) throw error;

    const candidates = buildCandidates((data || []) as SourceException[]);
    const { data: existing, error: existingError } = await context.supabase
      .from('motil_ai_decision_cases')
      .select('id,status,evidence_refs')
      .eq('organization_id', context.organizationId)
      .eq('created_by_user_id', context.userId)
      .eq('source_domain', 'executive')
      .eq('target_domain', 'production')
      .in('status', ['open', 'acknowledged']);
    if (existingError) throw existingError;

    const existingByKey = new Map<string, ExistingCase>();
    for (const row of (existing || []) as ExistingCase[]) {
      const key = keyFromRefs(row.evidence_refs);
      if (key?.startsWith('operational:production:source-fidelity:')) existingByKey.set(key, row);
    }

    const now = new Date().toISOString();
    let created = 0;
    let revalidated = 0;
    let archived = 0;
    const activeKeys = new Set(candidates.map((candidate) => candidate.decisionKey));

    for (const candidate of candidates) {
      const payload = {
        title: candidate.title,
        summary: candidate.summary,
        evidence_refs: candidate.evidenceRefs,
        uncertainty: 'El caso representa una limitación determinística de fidelidad/completitud de fuente. No demuestra por sí solo una pérdida de producción, una causa raíz ni un riesgo probabilístico.',
        contradictions: [],
        missing_evidence: candidate.missingEvidence,
        recommended_human_action: candidate.recommendedHumanAction,
        authority: 'advisory_only',
        updated_at: now,
        last_revalidated_at: now,
        last_revalidated_by_user_id: context.userId,
        last_revalidation_evidence_refs: candidate.evidenceRefs,
      };
      const current = existingByKey.get(candidate.decisionKey);
      if (current) {
        const { error: updateError } = await context.supabase
          .from('motil_ai_decision_cases')
          .update(payload)
          .eq('id', current.id)
          .eq('organization_id', context.organizationId)
          .eq('created_by_user_id', context.userId);
        if (updateError) throw updateError;
        revalidated += 1;
      } else {
        const { error: insertError } = await context.supabase.from('motil_ai_decision_cases').insert({
          organization_id: context.organizationId,
          created_by_user_id: context.userId,
          source_domain: 'executive',
          target_domain: 'production',
          source_conversation_id: null,
          source_message_id: null,
          ...payload,
          recommended_workflow_key: null,
          status: 'open',
        });
        if (insertError) throw insertError;
        created += 1;
      }
    }

    for (const [decisionKey, row] of existingByKey.entries()) {
      if (activeKeys.has(decisionKey)) continue;
      if (!(await isResolved(context.supabase, context.organizationId, decisionKey))) continue;
      const { error: archiveError } = await context.supabase
        .from('motil_ai_decision_cases')
        .update({ status: 'archived', updated_at: now, last_revalidated_at: now, last_revalidated_by_user_id: context.userId })
        .eq('id', row.id)
        .eq('organization_id', context.organizationId)
        .eq('created_by_user_id', context.userId);
      if (archiveError) throw archiveError;
      archived += 1;
    }

    return NextResponse.json({
      synced: true,
      created,
      revalidated,
      archived,
      active: candidates.length,
      coverage: { production: true },
      authority: 'advisory_only',
      policy: 'Producción sólo materializa deuda de fidelidad agregada desde production_source_fidelity_exceptions_v1. No estima producción, no infiere causa raíz y no modifica verdad operacional.',
    });
  } catch (error) {
    console.error('[production-decision-cases-sync] failed', { detail: error instanceof Error ? error.message : String(error ?? 'unknown') });
    return NextResponse.json({ error: 'No fue posible sincronizar los casos de Producción.' }, { status: 500 });
  }
}
