export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import {
  REGULATORY_EVIDENCE_LINK_POLICY,
  REGULATORY_EVIDENCE_STATUSES,
} from '@/lib/intelligence/regulatory-evidence-link';
import {
  loadRegulatoryCanonicalEvidence,
  type RegulatoryCanonicalEvidenceScope,
} from '@/lib/intelligence/regulatory-canonical-evidence';

function canRead(level: string) {
  return level === 'ED' || level === 'LEC';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const parsedLimit = Number(request.nextUrl.searchParams.get('limit') || 25);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(Math.trunc(parsedLimit), 100)) : 25;

  try {
    const [
      mantOps,
      mantExec,
      prodOps,
      hseDocs,
      hseBoard,
      hseRisks,
      mantDocs,
      warehouseDocs,
      sosDocs,
      legal,
    ] = await Promise.all([
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_GERENCIAL),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.PROD_OPERACIONES),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_DOCUMENTACION),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_TABLERO),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.HSE_RIESGOS),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_DOCUMENTOS),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.BODEGA_DOCUMENTOS),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.SOS_DOCUMENTOS),
      getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO),
    ]);

    const allowedScopes: RegulatoryCanonicalEvidenceScope[] = [];
    if ([mantOps, mantExec, prodOps].some(canRead)) allowedScopes.push('assets');
    if ([hseDocs, mantDocs, warehouseDocs, sosDocs, legal].some(canRead)) allowedScopes.push('documents');
    if ([hseDocs, hseBoard, hseRisks].some(canRead)) {
      allowedScopes.push('hse');
      allowedScopes.push('inspections');
    }

    const canonicalEvidence = await loadRegulatoryCanonicalEvidence(context, allowedScopes, limit);

    return NextResponse.json({
      statuses: REGULATORY_EVIDENCE_STATUSES,
      policy: REGULATORY_EVIDENCE_LINK_POLICY,
      canonicalEvidence,
      authority: 'advisory_reference_only',
      operationalMutationExecuted: false,
      complianceVerdictCalculated: false,
      persistence: 'regulatory_evidence_linking_v2',
    });
  } catch (error) {
    console.error('[regulatory-evidence-linking] load failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible cargar referencias regulatorias canónicas.' }, { status: 500 });
  }
}
