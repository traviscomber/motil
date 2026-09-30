export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { loadRegulatoryIntelligenceContext } from '@/lib/intelligence/regulatory-intelligence-context';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function evidenceText(item: { label: string; provenance?: Record<string, unknown> }) {
  return normalize([item.label, ...Object.values(item.provenance || {})].join(' '));
}

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
    const allowedScopes = new Set<string>();
    if (obligation.motilDomains.includes('documents')) allowedScopes.add('documents');
    if (obligation.motilDomains.includes('assets')) allowedScopes.add('assets');
    if (obligation.motilDomains.includes('hse')) allowedScopes.add('hse');
    if (obligation.motilDomains.includes('inspections')) allowedScopes.add('inspections');

    const relevantEvidence = evidence.filter((item) => {
      if (!allowedScopes.has(item.scope)) return false;
      const text = evidenceText(item);
      return obligation.evidenceKeywords.some((keyword) => text.includes(normalize(keyword)));
    });

    const hasEvidence = relevantEvidence.length > 0;
    const actionState = hasEvidence ? 'review_evidence' : 'validate_and_collect';
    const nextAction = hasEvidence
      ? `Revisar la evidencia candidata vinculada y confirmar si cubre la obligación. Luego: ${obligation.nextAction}`
      : obligation.nextAction;

    return {
      ...obligation,
      evidenceCount: relevantEvidence.length,
      evidenceRefs: relevantEvidence.slice(0, 8).map((item) => ({
        canonicalRef: item.canonicalRef,
        label: item.label,
        scope: item.scope,
        freshnessAt: item.freshnessAt,
      })),
      actionState,
      nextAction,
      reviewState: hasEvidence ? 'evidence_observed_requires_review' : 'evidence_not_observed_requires_review',
      applicabilityState: 'requires_human_validation',
      responsibleState: 'business_owner_defined_legal_accountability_visible',
      deadlineState: obligation.timingRule.includes('validar') || obligation.timingRule.includes('depende')
        ? 'requires_human_validation'
        : 'rule_available_requires_case_validation',
    };
  }).sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 } as const;
    return rank[a.priority] - rank[b.priority];
  });

  return NextResponse.json({
    available: true,
    authority: 'SERNAGEOMIN',
    obligations,
    evidence,
    summary: {
      obligations: obligations.length,
      critical: obligations.filter((item) => item.priority === 'critical').length,
      withMatchedEvidence: obligations.filter((item) => item.evidenceCount > 0).length,
      withoutMatchedEvidence: obligations.filter((item) => item.evidenceCount === 0).length,
      requiringApplicabilityReview: obligations.length,
      complianceVerdictCalculated: false,
    },
    operatingModel: {
      legal: 'Valida aplicabilidad, interpreta la obligación, controla plazo y custodia trazabilidad.',
      businessOwner: 'Ejecuta la acción técnica u operacional y produce la evidencia.',
      closeRule: 'Legal no cierra una obligación sin evidencia suficiente y revisión humana.',
    },
    policy: regulatory.obligationPolicy,
    sourcePolicy: regulatory.policy,
    complianceVerdictCalculated: false,
    operationalMutationExecuted: false,
    persistence: 'mining_legal_obligation_inbox_v2',
  });
}
