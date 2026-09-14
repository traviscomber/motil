export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { loadRegulatoryIntelligenceContext } from '@/lib/intelligence/regulatory-intelligence-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const parsedLimit = Number(request.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(Math.trunc(parsedLimit), 50)) : 20;
  const regulatoryContext = await loadRegulatoryIntelligenceContext(context, limit);

  return NextResponse.json({
    available: regulatoryContext.available,
    authority: regulatoryContext.authority,
    allowedScopes: regulatoryContext.allowedScopes,
    sourceCount: regulatoryContext.sourceCount,
    sources: regulatoryContext.sources,
    installationContext: regulatoryContext.installationContext,
    canonicalEvidence: regulatoryContext.canonicalEvidence,
    policy: regulatoryContext.policy,
    complianceVerdictCalculated: false,
    operationalMutationExecuted: false,
    errorCode: regulatoryContext.errorCode,
    persistence: 'regulatory_intelligence_context_v1',
  });
}
