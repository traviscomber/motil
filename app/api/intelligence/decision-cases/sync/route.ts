export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { canAccessDecisionCaseDomain } from '@/lib/intelligence/decision-case-access';

type Candidate = {
  decisionKey: string;
  targetDomain: 'maintenance' | 'geology';
  title: string;
  summary: string;
  evidenceRefs: Record<string, unknown>[];
  uncertainty: string | null;
  contradictions: string[];
  missingEvidence: string[];
  recommendedHumanAction: string;
};

const keyFromRefs = (refs: unknown): string | null => {
  if (!Array.isArray(refs)) return null;
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).decisionKey === 'string') {
      return (ref as any).decisionKey;
    }
  }
  return null;
};

const compact = (values: Array<string | null | undefined>) => values.filter((value): value is string => Boolean(value));

async function maintenanceCandidates(db: any, organizationId: string): Promise<Candidate[]> {
  const [preventive, closeReadiness] = await Promise.all([
    db
      .from('preventive_maintenance_hour_status_v1')
      .select('schedule_id,canonical_asset_id,asset_code,asset_name,task_name,priority,frequency_hours,effective_current_meter,due_meter,remaining_hours,hour_status,meter_basis_conflict,meter_evidence_source,generated_work_order_id')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .eq('alert_due', true)
      .order('remaining_hours', { ascending: true })
      .limit(20),
    db
      .from('work_order_close_readiness_v2')
      .select('work_order_id,work_order_number,title,status,priority,canonical_asset_id,missing_asset,missing_root_cause,missing_preventive_actions,missing_actual_hours,missing_runtime_evidence,runtime_evidence_status,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,standard_plan_steps_pending,next_action')
      .eq('organization_id', organizationId)
      .eq('ready_to_close', false)
      .limit(30),
  ]);

  if (preventive.error) throw preventive.error;
  if (closeReadiness.error) throw closeReadiness.error;

  const preventiveCases: Candidate[] = (preventive.data || []).map((row: any) => {
    const missing = compact([
      row.meter_basis_conflict ? 'Resolver conflicto entre lecturas de horómetro antes de decidir la intervención.' : null,
      row.effective_current_meter == null ? 'Falta lectura efectiva de horómetro.' : null,
      row.generated_work_order_id ? null : 'No existe OT vinculada a esta pauta en la evidencia actual.',
    ]);
    const remaining = row.remaining_hours == null ? 'sin cálculo disponible' : `${Number(row.remaining_hours).toLocaleString('es-CL')} h`;
    return {
      decisionKey: `operational:maintenance:preventive:${row.schedule_id}`,
      targetDomain: 'maintenance',
      title: `${row.asset_code || row.asset_name || 'Activo'} · ${row.task_name || 'mantención preventiva'}`,
      summary: `La pauta preventiva está en condición de atención por horómetro (${row.hour_status || 'estado no informado'}). Margen registrado: ${remaining}. MOTIL no crea ni cierra una OT automáticamente desde este caso.`,
      evidenceRefs: [
        { source: 'preventive_maintenance_hour_status_v1', decisionKey: `operational:maintenance:preventive:${row.schedule_id}`, scheduleId: row.schedule_id, assetId: row.canonical_asset_id, mode: 'read' },
      ],
      uncertainty: row.meter_basis_conflict ? 'Existe conflicto en la base de horómetro; la prioridad técnica debe validarse antes de ejecutar trabajo.' : 'La vista acredita condición de pauta, no diagnóstico técnico ni necesidad de detener el equipo.',
      contradictions: row.meter_basis_conflict ? ['La base de horómetro presenta evidencia conflictiva.'] : [],
      missingEvidence: missing,
      recommendedHumanAction: row.generated_work_order_id
        ? 'Revisar la OT vinculada, validar condición real del activo y programar/ejecutar según autoridad humana.'
        : 'Validar horómetro y condición del activo; si corresponde, generar o programar la OT desde Mantención.',
    };
  });

  const closureCases: Candidate[] = (closeReadiness.data || []).map((row: any) => {
    const missing = compact([
      row.missing_asset ? 'Falta activo canónico asociado.' : null,
      row.missing_root_cause ? 'Falta causa raíz registrada.' : null,
      row.missing_preventive_actions ? 'Falta acción preventiva registrada.' : null,
      row.missing_actual_hours ? 'Faltan horas reales de ejecución.' : null,
      row.missing_runtime_evidence ? 'Falta evidencia de horómetro/runtime requerida.' : null,
      Number(row.open_procurement_orders || 0) > 0 ? `${row.open_procurement_orders} orden(es) de compra siguen abiertas.` : null,
      Number(row.pending_parts || 0) > 0 ? `${row.pending_parts} repuesto(s) siguen pendientes.` : null,
      Number(row.unmet_material_requirements || 0) > 0 ? `${row.unmet_material_requirements} requerimiento(s) de material no están satisfechos.` : null,
      Number(row.pending_external_services || 0) > 0 ? `${row.pending_external_services} servicio(s) externo(s) siguen pendientes.` : null,
      Number(row.open_labor_entries || 0) > 0 ? `${row.open_labor_entries} registro(s) de mano de obra siguen abiertos.` : null,
      Number(row.standard_plan_steps_pending || 0) > 0 ? `${row.standard_plan_steps_pending} paso(s) del plan estándar siguen pendientes.` : null,
    ]);
    return {
      decisionKey: `operational:maintenance:closure:${row.work_order_id}`,
      targetDomain: 'maintenance',
      title: `${row.work_order_number || 'OT'} · cierre bloqueado`,
      summary: `${row.title || 'Orden de trabajo'} no cumple todavía las condiciones determinísticas de cierre. Estado operacional informado: ${row.status || 'sin estado'}. Siguiente control derivado: ${row.next_action || 'revisar evidencia faltante'}.`,
      evidenceRefs: [
        { source: 'work_order_close_readiness_v2', decisionKey: `operational:maintenance:closure:${row.work_order_id}`, workOrderId: row.work_order_id, assetId: row.canonical_asset_id, mode: 'read' },
      ],
      uncertainty: 'El bloqueo describe completitud y controles del cierre; no implica por sí solo que el trabajo físico esté mal ejecutado.',
      contradictions: [],
      missingEvidence: missing,
      recommendedHumanAction: `Completar o validar el requisito indicado por “${row.next_action || 'readiness de cierre'}” dentro de la OT antes de solicitar cierre.`,
    };
  });

  return [...preventiveCases, ...closureCases];
}

async function geologyCandidates(db: any, organizationId: string): Promise<Candidate[]> {
  const { data, error } = await db
    .from('production_geology_geologist_queue_v3')
    .select('drill_hole_id,hole_code,mine_name,sector_name,status,drilled_depth_m,orientation_confidence,interval_count,mineralization_interval_count,structural_interval_count,operational_geology_evidence_count,visual_mineral_evidence_count,structural_evidence_count,lithology_evidence_count,recovery_evidence_count,topography_evidence_count,survey_evidence_count,deterministic_gap_count,mineralization_conflict_count,severe_chronology_count,material_chronology_count,effective_priority_rank,effective_attention_reason,recommended_action,source_reference')
    .eq('organization_id', organizationId)
    .gt('deterministic_gap_count', 0)
    .order('effective_priority_rank', { ascending: true })
    .limit(12);
  if (error) throw error;

  return (data || []).map((row: any) => {
    const missing = compact([
      Number(row.lithology_evidence_count || 0) === 0 ? 'No hay evidencia de litología estructurada en la cobertura consultada.' : null,
      Number(row.recovery_evidence_count || 0) === 0 ? 'No hay evidencia de recuperación estructurada en la cobertura consultada.' : null,
      Number(row.topography_evidence_count || 0) === 0 ? 'No hay evidencia topográfica explícita en la cobertura consultada.' : null,
      Number(row.survey_evidence_count || 0) === 0 ? 'No hay evidencia de survey downhole estructurada en la cobertura consultada.' : null,
      !row.orientation_confidence || String(row.orientation_confidence).toLowerCase() === 'low' ? 'Orientación ausente o de baja confianza.' : null,
    ]);
    const contradictions = compact([
      Number(row.mineralization_conflict_count || 0) > 0 ? `${row.mineralization_conflict_count} conflicto(s) de mineralización detectados.` : null,
      Number(row.severe_chronology_count || 0) > 0 ? `${row.severe_chronology_count} conflicto(s) severos de cronología.` : null,
      Number(row.material_chronology_count || 0) > 0 ? `${row.material_chronology_count} conflicto(s) materiales de cronología.` : null,
    ]);
    return {
      decisionKey: `operational:geology:readiness:${row.drill_hole_id}`,
      targetDomain: 'geology',
      title: `${row.hole_code || 'Sondaje'} · revisión geológica prioritaria`,
      summary: `${row.mine_name || 'Mina sin identificar'}${row.sector_name ? ` · ${row.sector_name}` : ''}. La cola geológica registra ${row.deterministic_gap_count} brecha(s) determinísticas y prioridad ${row.effective_priority_rank ?? 'sin ranking'}. ${row.effective_attention_reason || 'Requiere revisión profesional antes de usar la evidencia para decisiones geológicas.'}`,
      evidenceRefs: [
        { source: 'production_geology_geologist_queue_v3', decisionKey: `operational:geology:readiness:${row.drill_hole_id}`, drillHoleId: row.drill_hole_id, sourceReference: row.source_reference, mode: 'read' },
      ],
      uncertainty: 'Este caso identifica deuda o conflicto de evidencia. No infiere continuidad mineralizada, ley, reservas, estructura ni interpretación geológica no registrada.',
      contradictions,
      missingEvidence: missing,
      recommendedHumanAction: row.recommended_action || 'Revisar la evidencia fuente, completar la brecha prioritaria y revalidar el sondaje antes de promover una interpretación.',
    };
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const sourceAllowed = await canAccessDecisionCaseDomain(request, 'executive');
  if (!sourceAllowed) return NextResponse.json({ error: 'No tienes acceso al contexto ejecutivo requerido para sincronizar casos.' }, { status: 403 });

  const [maintenanceAllowed, geologyAllowed] = await Promise.all([
    canAccessDecisionCaseDomain(request, 'maintenance'),
    canAccessDecisionCaseDomain(request, 'geology'),
  ]);

  try {
    const candidateGroups = await Promise.all([
      maintenanceAllowed ? maintenanceCandidates(context.supabase, context.organizationId) : Promise.resolve([]),
      geologyAllowed ? geologyCandidates(context.supabase, context.organizationId) : Promise.resolve([]),
    ]);
    const candidates = candidateGroups.flat();
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await context.supabase
      .from('motil_ai_decision_cases')
      .select('id,status,target_domain,evidence_refs')
      .eq('organization_id', context.organizationId)
      .eq('created_by_user_id', context.userId)
      .eq('source_domain', 'executive')
      .in('target_domain', ['maintenance', 'geology'])
      .in('status', ['open', 'acknowledged']);
    if (existingError) throw existingError;

    const existingByKey = new Map<string, any>();
    for (const row of existing || []) {
      const key = keyFromRefs(row.evidence_refs);
      if (key?.startsWith('operational:')) existingByKey.set(key, row);
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
          ...payload,
          recommended_workflow_key: null,
          status: 'open',
        });
        if (error) throw error;
        created += 1;
      }
    }

    for (const [decisionKey, row] of existingByKey.entries()) {
      if (activeKeys.has(decisionKey)) continue;
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
      coverage: {
        maintenance: maintenanceAllowed,
        geology: geologyAllowed,
      },
      authority: 'advisory_only',
      policy: 'La sincronización sólo materializa y revalida casos advisory. No crea/cierra OT, no cambia activos y no escribe hechos geológicos.',
    });
  } catch (error) {
    console.error('[decision-cases-sync] failed', { detail: error instanceof Error ? error.message : String(error ?? 'unknown') });
    return NextResponse.json({ error: 'No fue posible sincronizar los casos operacionales.' }, { status: 500 });
  }
}
