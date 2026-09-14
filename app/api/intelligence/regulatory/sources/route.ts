export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  REGULATORY_SOURCE_POLICY,
  RES_0886_TAXONOMY_ENVELOPE,
  listRegulatorySources,
  type RegulatoryEvidenceClass,
} from '@/lib/intelligence/regulatory-sources';

const EVIDENCE_CLASSES = new Set<RegulatoryEvidenceClass>(['regulatory_knowledge', 'external_reference']);

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')?.trim() || undefined;
  const rawEvidenceClass = request.nextUrl.searchParams.get('evidenceClass')?.trim() || undefined;

  if (rawEvidenceClass && !EVIDENCE_CLASSES.has(rawEvidenceClass as RegulatoryEvidenceClass)) {
    return NextResponse.json({ error: 'Clase de evidencia regulatoria no válida.' }, { status: 400 });
  }

  const sources = listRegulatorySources({
    domain,
    evidenceClass: rawEvidenceClass as RegulatoryEvidenceClass | undefined,
  });

  return NextResponse.json({
    sources,
    count: sources.length,
    taxonomy: RES_0886_TAXONOMY_ENVELOPE,
    policy: REGULATORY_SOURCE_POLICY,
    authority: 'reference_only',
    operationalMutationExecuted: false,
    persistence: 'regulatory_source_registry_v1',
  });
}
