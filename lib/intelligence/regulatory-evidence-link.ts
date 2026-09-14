export type RegulatoryEvidenceStatus = 'observed' | 'missing' | 'not_applicable' | 'requires_review';

export type RegulatoryEvidenceLink = {
  sourceId: string;
  regulatoryAnchor: string;
  requirementLabel: string;
  motilEntityType: string;
  motilEntityId: string;
  expectedEvidenceType: string;
  canonicalEvidenceRef: string | null;
  status: RegulatoryEvidenceStatus;
  observedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export const REGULATORY_EVIDENCE_LINK_POLICY = {
  authority: 'advisory_reference_only',
  complianceBoundary: 'evidence_linking_never_declares_legal_compliance',
  canonicalBoundary: 'canonical_operational_sources_remain_authoritative',
  missingEvidenceBoundary: 'missing_reference_is_a_validation_gap_not_proof_of_non_compliance',
  notApplicableBoundary: 'not_applicable_requires_human_validation',
  mutationBoundary: 'read_only_no_operational_mutation',
} as const;

export const REGULATORY_EVIDENCE_STATUSES: readonly RegulatoryEvidenceStatus[] = [
  'observed',
  'missing',
  'not_applicable',
  'requires_review',
];

export function classifyRegulatoryEvidenceLink(input: {
  canonicalEvidenceRef?: string | null;
  explicitlyNotApplicable?: boolean;
  humanValidatedNotApplicable?: boolean;
  requiresReview?: boolean;
}): RegulatoryEvidenceStatus {
  if (input.requiresReview) return 'requires_review';
  if (input.explicitlyNotApplicable) {
    return input.humanValidatedNotApplicable ? 'not_applicable' : 'requires_review';
  }
  if (typeof input.canonicalEvidenceRef === 'string' && input.canonicalEvidenceRef.trim()) return 'observed';
  return 'missing';
}

export function regulatoryEvidenceLinkPrompt(links: readonly RegulatoryEvidenceLink[]) {
  if (!links.length) return 'REGULATORY EVIDENCE LINKING: no hay vínculos regulatorios validados disponibles.';

  const rows = links.map((link) =>
    `${link.requirementLabel} | status=${link.status} | canonicalEvidenceRef=${link.canonicalEvidenceRef || 'none'} | anchor=${link.regulatoryAnchor}`,
  );

  return [
    'REGULATORY EVIDENCE LINKING — CONTEXTO ADVISORY, NO DECLARA COMPLIANCE',
    ...rows,
    'Interpretación obligatoria: observed significa que existe una referencia canónica visible; missing significa brecha de evidencia a validar; not_applicable sólo es válido con revisión humana; requires_review no puede convertirse en conclusión legal.',
  ].join('\n');
}
