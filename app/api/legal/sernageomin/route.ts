export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { loadRegulatoryIntelligenceContext } from '@/lib/intelligence/regulatory-intelligence-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const regulatory = await loadRegulatoryIntelligenceContext(context, 100);
  if (!regulatory.available || !regulatory.canonicalEvidence) {
    return NextResponse.json({
      available: false,
      authority: 'SERNAGEOMIN',
      obligations: [],
      evidence: [],
      complianceVerdictCalculated: false,
      errorCode: regulatory.errorCode || 'regulatory_context_unavailable',
    });
  }

  const evidence = regulatory.canonicalEvidence.items;
  const obligations = regulatory.obligations.map((obligation) => {
    const relevantEvidence = evidence.filter((item) => {
      if (item.scope === 'documents' && obligation.motilDomains.includes('documents')) return true;
      if (item.scope === 'assets' && obligation.motilDomains.includes('assets')) return true;
      if (item.scope === 'hse' && obligation.motilDomains.includes('hse')) return true;
      if (item.scope === 'inspections' && obligation.motilDomains.includes('inspections')) return true;
      return false;
    });

    return {
      ...obligation,
      evidenceCount: relevantEvidence.length,
      evidenceRefs: relevantEvidence.slice(0, 8).map((item) => ({
        canonicalRef: item.canonicalRef,
        label: item.label,
        scope: item.scope,
        freshnessAt: item.freshnessAt,
      })),
      reviewState: relevantEvidence.length ? 'evidence_observed_requires_review' : 'evidence_not_observed_requires_review',
      applicabilityState: 'requires_human_validation',
      responsibleState: 'role_suggested_not_assigned',
      deadlineState: obligation.timingRule.includes('validar') || obligation.timingRule.includes('depende')
        ? 'requires_human_validation'
        : 'rule_available_requires_case_validation',
    };
  });

  return NextResponse.json({
    available: true,
    authority: 'SERNAGEOMIN',
    obligations,
    evidence,
    summary: {
      obligations: obligations.length,
      withObservedEvidence: obligations.filter((item) => item.evidenceCount > 0).length,
      requiringApplicabilityReview: obligations.length,
      complianceVerdictCalculated: false,
    },
    policy: regulatory.obligationPolicy,
    sourcePolicy: regulatory.policy,
    complianceVerdictCalculated: false,
    operationalMutationExecuted: false,
    persistence: 'sernageomin_legal_cockpit_v1',
  });
}
