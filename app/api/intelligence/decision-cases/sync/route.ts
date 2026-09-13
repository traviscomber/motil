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

type ExistingCase = {
  id: string;
  status: 'open' | 'acknowledged';
  target_domain: 'maintenance' | 'geology';
  evidence_refs: unknown;
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
      .select('schedule_id,canonical_asset_id,asset_code,asset_name,task_name,effective_current_meter,remaining_hours,hour_status,meter_basis_conflict,generated_work_order_id')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .eq('alert_due', true)
      .order('remaining_hours', { ascending: true })
      .limit(50),
    db
      .from('work_order_close_readiness_v2')
      .select('work_order_id,work_order_number,title,status,canonical_asset_id,missing_asset,missing_root_cause,missing_preventive_actions,missing_actual_hours,missing_runtime_evidence,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,standard_plan_steps_pending,next_action')
      .eq('organization_id', organizationId)
      .eq('ready_to_close', false)
      .limit(50),
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
    .from('production_geology_2026_readiness_v1')
    .select('drill_hole_id,hole_code,mine_name,sector_name,status,drilled_depth_m,orientation_confidence,interval_count,point_observation_count,transition_count,daily_span_count,topography_evidence_count,survey_evidence_count,mineralization_conflict_count,blocked_2026,review_2026,mine_missing,sector_missing,orientation_missing,readiness_state,readiness_reason,source_reference')
    .eq('organization_id', organizationId)
    .neq('readiness_state', 'operational_geology_available')
    .order('blocked_2026', { ascending: false })
    .order('review_2026', { ascending: false })
    .limit(30);
  if (error) throw error;

  return (data || []).map((row: any) => {
    const missing = compact([
      row.mine_missing ? 'Falta mina asociada al sondaje.' : null,
      row.sector_missing ? 'Falta sector asociado al sondaje.' : null,
      row.orientation_missing ? 'Falta orientación suficiente para usar geometría con confianza.' : null,
      Number(row.topography_evidence_count || 0) === 0 ? 'No hay evidencia topográfica explícita en la cobertura consultada.' : null,
      Number(row.survey_evidence_count || 0) === 0 ? 'No hay evidencia de survey downhole estructurada en la cobertura consultada.' : null,
    ]);
    const contradictions = compact([
      Number(row.mineralization_conflict_count || 0) > 0 ? `${row.mineralization_conflict_count} conflicto(s) de mineralización detectados.` : null,
    ]);
    const blockers = Number(row.blocked_2026 || 0);
    const reviews = Number(row.review_2026 || 0);
    return {
      decisionKey: `operational:geology:readiness:${row.drill_hole_id}`,
      targetDomain: 'geology',
      title: `${row.hole_code || 'Sondaje'} · geometría/evidencia a validar`,
      summary: `${row.mine_name || 'Mina sin identificar'}${row.sector_name ? ` · ${row.sector_name}` : ''}. Estado: ${row.readiness_state || 'sin estado'}. ${row.readiness_reason || 'La evidencia requiere validación profesional.'} Bloqueos 2026: ${blockers}; revisiones: ${reviews}.`,
      evidenceRefs: [
        { source: 'production_geology_2026_readiness_v1', decisionKey: `operational:geology:readiness:${row.drill_hole_id}`, drillHoleId: row.drill_hole_id, sourceReference: row.source_reference, mode: 'read' },
      ],
      uncertainty: 'El readiness identifica limitaciones de evidencia y geometría. No infiere continuidad mineralizada, ley, reservas, estructura ni interpretación geológica no registrada.',
      contradictions,
      missingEvidence: missing,
      recommendedHumanAction: 'Revisar la evidencia fuente, completar geometría o evidencia faltante y revalidar el sondaje antes de usarlo para una interpretación espacial de mayor confianza.',
    };
  });
}

async function isResolved(db: any, organizationId: string, decisionKey: string): Promise<boolean> {
  if (decisionKey.startsWith('operational:maintenance:preventive:')) {
    const scheduleId = decisionKey.replace('operational:maintenance:preventive:', '');
    const { data, error } = await db
      .from('preventive_maintenance_hour_status_v1')
      .select('alert_due,enabled')
      .eq('organization_id', organizationId)
      .eq('schedule_id', scheduleId)
      .maybeSingle();
    if (error) throw error;
    return !data || !data.enabled || !data.alert_due;
  }

  if (decisionKey.startsWith('operational:maintenance:closure:')) {
    const workOrderId = decisionKey.replace('operational:maintenance:closure:', '');
    const { data, error } = await db
      .from('work_order_close_readiness_v2')
      .select('ready_to_close')
      .eq('organization_id', organizationId)
      .eq('work_order_id', workOrderId)
      .maybeSingle();
    if (error) throw error;
    return !data || Boolean(data.ready_to_close);
  }

  if (decisionKey.startsWith('operational:geology:readiness:')) {
    const drillHoleId = decisionKey.replace('operational:geology:readiness:', '');
    const { data, error } = await db
      .from('production_geology_2026_readiness_v1')
      .select('readiness_state')
      .eq('organization_id', organizationId)
      .eq('drill_hole_id', drillHoleId)
      .maybeSingle();
    if (error) throw error;
    return !data || data.readiness_state === 'operational_geology_available';
  }

  return false;
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
    const authorizedDomains = compact([
      maintenanceAllowed ? 'maintenance' : null,
      geologyAllowed ? 'geology' : null,
    ]);

    const { data: existing, error: existingError } = authorizedDomains.length
      ? await context.supabase
          .from('motil_ai_decision_cases')
          .select('id,status,target_domain,evidence_refs')
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
      coverage: { maintenance: maintenanceAllowed, geology: geologyAllowed },
      authority: 'advisory_only',
      policy: 'La sincronización sólo materializa y revalida casos advisory. No crea/cierra OT, no cambia activos y no escribe hechos geológicos. Un caso sólo se archiva tras comprobar su fuente canónica exacta.',
    });
  } catch (error) {
    console.error('[decision-cases-sync] failed', { detail: error instanceof Error ? error.message : String(error ?? 'unknown') });
    return NextResponse.json({ error: 'No fue posible sincronizar los casos operacionales.' }, { status: 500 });
  }
}
