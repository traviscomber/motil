export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import {
  REGULATORY_MAPPING_REVIEW_POLICY,
  validateRegulatoryMappingDecision,
  type RegulatoryMappingDecision,
  type RegulatoryMappingEntityType,
} from '@/lib/intelligence/regulatory-mapping-review';

const DECISIONS = new Set<RegulatoryMappingDecision>(['requires_review', 'accepted', 'rejected']);
const ENTITY_TYPES = new Set<RegulatoryMappingEntityType>(['asset', 'hse_facility']);

function canRead(level: string) {
  return level === 'ED' || level === 'LEC';
}

function canEdit(level: string) {
  return level === 'ED';
}

async function resolveReviewAccess(userId: string, role?: string) {
  const [hseDocs, hseRisks, legal, maintenanceManagerial] = await Promise.all([
    getModuleAccessLevel(userId, role, MODULE_KEYS.HSE_DOCUMENTACION),
    getModuleAccessLevel(userId, role, MODULE_KEYS.HSE_RIESGOS),
    getModuleAccessLevel(userId, role, MODULE_KEYS.LEGAL_MODULO),
    getModuleAccessLevel(userId, role, MODULE_KEYS.MANT_GERENCIAL),
  ]);

  return {
    read: [hseDocs, hseRisks, legal, maintenanceManagerial].some(canRead),
    edit: [hseDocs, hseRisks, legal].some(canEdit),
  };
}

async function entityExists(
  context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>,
  entityType: RegulatoryMappingEntityType,
  entityId: string,
) {
  const table = entityType === 'asset' ? 'canonical_assets_current' : 'hse_facilities';
  const { data, error } = await context.supabase
    .from(table)
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('id', entityId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await resolveReviewAccess(context.userId, context.role);
  if (!access.read) return NextResponse.json({ error: 'No tienes acceso al registro de revisión regulatoria.' }, { status: 403 });

  const decision = request.nextUrl.searchParams.get('decision')?.trim() || null;
  if (decision && !DECISIONS.has(decision as RegulatoryMappingDecision)) {
    return NextResponse.json({ error: 'Estado de revisión no válido.' }, { status: 400 });
  }

  const parsedLimit = Number(request.nextUrl.searchParams.get('limit') || 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(Math.trunc(parsedLimit), 100)) : 50;

  try {
    let query = context.supabase
      .from('motil_regulatory_mapping_reviews')
      .select('id,source_id,source_anchor,source_anchor_status,regulatory_code,regulatory_label,motil_entity_type,motil_entity_id,decision,review_note,reviewed_by_user_id,reviewed_at,created_at,updated_at')
      .eq('organization_id', context.organizationId)
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (decision) query = query.eq('decision', decision);
    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      reviews: data || [],
      count: data?.length || 0,
      canEdit: access.edit,
      policy: REGULATORY_MAPPING_REVIEW_POLICY,
      authority: 'human_review_only',
      complianceVerdictCalculated: false,
      operationalMutationExecuted: false,
      persistence: 'regulatory_mapping_reviews_v1',
    });
  } catch (error) {
    console.error('[regulatory-mapping-reviews] load failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible cargar las revisiones regulatorias.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await resolveReviewAccess(context.userId, context.role);
  if (!access.edit) return NextResponse.json({ error: 'No tienes permiso para decidir mappings regulatorios.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const regulatoryLabel = typeof body?.regulatoryLabel === 'string' ? body.regulatoryLabel.trim() : '';
  const entityType = typeof body?.motilEntityType === 'string' ? body.motilEntityType.trim() : '';
  const entityId = typeof body?.motilEntityId === 'string' ? body.motilEntityId.trim() : '';
  const decision = typeof body?.decision === 'string' ? body.decision.trim() : '';
  const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim().slice(0, 2000) : null;

  if (!regulatoryLabel || !entityId || !ENTITY_TYPES.has(entityType as RegulatoryMappingEntityType) || !DECISIONS.has(decision as RegulatoryMappingDecision)) {
    return NextResponse.json({ error: 'Solicitud de revisión regulatoria inválida.' }, { status: 400 });
  }

  const validation = validateRegulatoryMappingDecision({
    regulatoryLabel,
    decision: decision as RegulatoryMappingDecision,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message, code: validation.code }, { status: 409 });
  }

  try {
    const exists = await entityExists(context, entityType as RegulatoryMappingEntityType, entityId);
    if (!exists) return NextResponse.json({ error: 'La entidad MOTIL no existe dentro de la organización actual.' }, { status: 404 });

    const candidate = validation.candidate;
    const now = new Date().toISOString();
    const payload = {
      organization_id: context.organizationId,
      source_id: candidate.sourceId,
      source_anchor: candidate.sourceSection,
      source_anchor_status: candidate.sourceAnchorStatus,
      regulatory_code: candidate.regulatoryCode,
      regulatory_label: candidate.regulatoryLabel,
      motil_entity_type: entityType,
      motil_entity_id: entityId,
      decision,
      review_note: reviewNote,
      reviewed_by_user_id: context.userId,
      reviewed_at: now,
      updated_at: now,
    };

    const { data, error } = await context.supabase
      .from('motil_regulatory_mapping_reviews')
      .upsert(payload, {
        onConflict: 'organization_id,source_id,source_anchor,regulatory_label,motil_entity_type,motil_entity_id',
      })
      .select('id,source_id,source_anchor,source_anchor_status,regulatory_code,regulatory_label,motil_entity_type,motil_entity_id,decision,review_note,reviewed_by_user_id,reviewed_at,created_at,updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({
      review: data,
      policy: REGULATORY_MAPPING_REVIEW_POLICY,
      authority: 'human_review_only',
      complianceVerdictCalculated: false,
      operationalMutationExecuted: false,
      persistence: 'regulatory_mapping_reviews_v1',
    });
  } catch (error) {
    console.error('[regulatory-mapping-reviews] write failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible registrar la revisión regulatoria.' }, { status: 500 });
  }
}
