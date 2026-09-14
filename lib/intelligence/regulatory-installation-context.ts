import { RES_0886_TAXONOMY_ENVELOPE } from '@/lib/intelligence/regulatory-sources';

export type RegulatoryInstallationReviewStatus =
  | 'pending_exact_extraction'
  | 'pending_human_review'
  | 'approved_reference';

export type RegulatoryInstallationGeometry = 'point' | 'line' | 'polygon' | 'unknown';

export type RegulatoryInstallationTaxonomyNode = {
  sourceId: 'sernageomin-res-0886-2025';
  regulatoryCode: string;
  regulatoryLabel: string;
  level: number;
  parentCode: string | null;
  geometry: RegulatoryInstallationGeometry;
  sourceAnchor: string;
  reviewStatus: RegulatoryInstallationReviewStatus;
};

export const REGULATORY_INSTALLATION_CONTEXT_POLICY = {
  authority: 'reference_only',
  canonicalBoundary: 'never_overwrite_company_identifiers',
  complianceBoundary: 'taxonomy_mapping_does_not_prove_compliance',
  approvalBoundary: 'exact_values_require_official_source_anchor_and_human_review',
  operationalMutation: false,
} as const;

// Intentionally empty until every RES 0886 value is extracted from the official
// document with a stable source anchor and reviewed by a human. Partial search
// snippets or inferred mining vocabulary must never become approved taxonomy.
export const RES_0886_APPROVED_TAXONOMY: readonly RegulatoryInstallationTaxonomyNode[] = [];

export function getRegulatoryInstallationContext() {
  return {
    sourceId: RES_0886_TAXONOMY_ENVELOPE.sourceId,
    purpose: RES_0886_TAXONOMY_ENVELOPE.purpose,
    taxonomyStatus: RES_0886_TAXONOMY_ENVELOPE.taxonomyStatus,
    nodes: RES_0886_APPROVED_TAXONOMY,
    nodeCount: RES_0886_APPROVED_TAXONOMY.length,
    extractionGate: {
      officialSourceRequired: true,
      sourceAnchorRequired: true,
      humanReviewRequired: true,
      partialExtractionMayBePublishedAsApproved: false,
    },
    mappingPolicy: {
      canonicalEntityBoundary: RES_0886_TAXONOMY_ENVELOPE.canonicalEntityBoundary,
      mappingPolicy: RES_0886_TAXONOMY_ENVELOPE.mappingPolicy,
      requiredMappingFields: RES_0886_TAXONOMY_ENVELOPE.requiredMappingFields,
    },
    policy: REGULATORY_INSTALLATION_CONTEXT_POLICY,
  };
}
