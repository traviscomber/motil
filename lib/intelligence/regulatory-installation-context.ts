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

export type RegulatoryInstallationExtractionCandidate = {
  sourceId: 'sernageomin-res-0886-2025';
  regulatoryCode: string | null;
  regulatoryLabel: string;
  level: number;
  parentLabel: string | null;
  geometry: RegulatoryInstallationGeometry;
  sourceSection: string;
  sourceAnchorStatus: 'section_heading_only' | 'stable_page_anchor';
  reviewStatus: 'pending_human_review';
  extractionNote: string;
};

export const REGULATORY_INSTALLATION_CONTEXT_POLICY = {
  authority: 'reference_only',
  canonicalBoundary: 'never_overwrite_company_identifiers',
  complianceBoundary: 'taxonomy_mapping_does_not_prove_compliance',
  approvalBoundary: 'exact_values_require_official_source_anchor_and_human_review',
  candidateBoundary: 'verified_official_text_may_be_staged_as_candidate_but_not_published_as_approved_without_stable_page_anchor_and_human_review',
  operationalMutation: false,
} as const;

// Approved taxonomy remains intentionally empty until every promoted value has a
// stable source anchor in the official RES 0886 document and has passed human review.
export const RES_0886_APPROVED_TAXONOMY: readonly RegulatoryInstallationTaxonomyNode[] = [];

// These values were observed verbatim in the official SERNAGEOMIN RES 0886 PDF as
// indexed by the official sernageomin.cl document. They are staged only as extraction
// candidates. No synthetic regulatory code is assigned when the observed excerpt did
// not expose one, and section-heading anchors are not sufficient for approval.
export const RES_0886_EXTRACTION_CANDIDATES: readonly RegulatoryInstallationExtractionCandidate[] = [
  {
    sourceId: 'sernageomin-res-0886-2025',
    regulatoryCode: null,
    regulatoryLabel: 'MINA SUBTERRANEA',
    level: 0,
    parentLabel: null,
    geometry: 'polygon',
    sourceSection: 'CLASIFICACIÓN MINA SUBTERRANEA',
    sourceAnchorStatus: 'section_heading_only',
    reviewStatus: 'pending_human_review',
    extractionNote: 'Official excerpt exposes principal installation and geometry; page anchor still required before approval.',
  },
  ...[
    'POLVORIN MINA SUBTERRANEA',
    'CHANCADO MINA SUBTERRANEA',
    'TALLER MINA SUBTERRANEA',
    'LUBRICANTERA MINA SUBTERRANEA',
    'SURTIDOR DE COMBUSTIBLE MINA SUBTERRANEA',
    'OFICINA Y ADMINISTRACIÓN MINA SUBTERRANEA',
  ].map((regulatoryLabel) => ({
    sourceId: 'sernageomin-res-0886-2025' as const,
    regulatoryCode: null,
    regulatoryLabel,
    level: 2,
    parentLabel: 'MINA SUBTERRANEA',
    geometry: 'point' as const,
    sourceSection: 'CLASIFICACIÓN MINA SUBTERRANEA',
    sourceAnchorStatus: 'section_heading_only' as const,
    reviewStatus: 'pending_human_review' as const,
    extractionNote: 'Official excerpt exposes auxiliary installation; page anchor still required before approval.',
  })),
  {
    sourceId: 'sernageomin-res-0886-2025',
    regulatoryCode: null,
    regulatoryLabel: 'BOTADERO DE ESCORIA',
    level: 0,
    parentLabel: null,
    geometry: 'polygon',
    sourceSection: 'CLASIFICACIÓN BOTADEROS',
    sourceAnchorStatus: 'section_heading_only',
    reviewStatus: 'pending_human_review',
    extractionNote: 'Official excerpt states SIN INSTALACIÓN AUXILIAR; page anchor still required before approval.',
  },
  {
    sourceId: 'sernageomin-res-0886-2025',
    regulatoryCode: null,
    regulatoryLabel: 'BOTADERO DE ESTERIL',
    level: 0,
    parentLabel: null,
    geometry: 'polygon',
    sourceSection: 'CLASIFICACIÓN BOTADEROS',
    sourceAnchorStatus: 'section_heading_only',
    reviewStatus: 'pending_human_review',
    extractionNote: 'Official excerpt states SIN INSTALACIÓN AUXILIAR; page anchor still required before approval.',
  },
  {
    sourceId: 'sernageomin-res-0886-2025',
    regulatoryCode: null,
    regulatoryLabel: 'RIPIOS DE LIXIVIACIÓN',
    level: 0,
    parentLabel: null,
    geometry: 'polygon',
    sourceSection: 'CLASIFICACIÓN RIPIOS',
    sourceAnchorStatus: 'section_heading_only',
    reviewStatus: 'pending_human_review',
    extractionNote: 'Official excerpt states SIN INSTALACIÓN AUXILIAR; page anchor still required before approval.',
  },
  ...['ACOPIO DE MINERAL', 'ACOPIO DE CONCENTRADO', 'ACOPIO DE SALES'].map((regulatoryLabel) => ({
    sourceId: 'sernageomin-res-0886-2025' as const,
    regulatoryCode: null,
    regulatoryLabel,
    level: 0,
    parentLabel: null,
    geometry: 'point' as const,
    sourceSection: 'CLASIFICACIÓN ACOPIOS',
    sourceAnchorStatus: 'section_heading_only' as const,
    reviewStatus: 'pending_human_review' as const,
    extractionNote: 'Official excerpt states SIN INSTALACIÓN AUXILIAR; page anchor still required before approval.',
  })),
  ...[
    'CAMINOS',
    'ACUEDUCTO',
    'CONCENTRADUCTO/MINERODUCTO',
    'GASODUCTO',
    'LINEA FERREA',
    'OLEODUCTO',
    'RELAVEDUCTO',
    'TENDIDO ELECTRICO',
    'SALMUERODUCTO',
  ].map((regulatoryLabel) => ({
    sourceId: 'sernageomin-res-0886-2025' as const,
    regulatoryCode: null,
    regulatoryLabel,
    level: 0,
    parentLabel: null,
    geometry: 'line' as const,
    sourceSection: 'CLASIFICACIÓN DE OBRAS LINEALES',
    sourceAnchorStatus: 'section_heading_only' as const,
    reviewStatus: 'pending_human_review' as const,
    extractionNote: 'Official excerpt states SIN INSTALACIÓN AUXILIAR; page anchor still required before approval.',
  })),
];

export function getRegulatoryInstallationContext() {
  return {
    sourceId: RES_0886_TAXONOMY_ENVELOPE.sourceId,
    purpose: RES_0886_TAXONOMY_ENVELOPE.purpose,
    taxonomyStatus: RES_0886_TAXONOMY_ENVELOPE.taxonomyStatus,
    nodes: RES_0886_APPROVED_TAXONOMY,
    nodeCount: RES_0886_APPROVED_TAXONOMY.length,
    extractionCandidates: RES_0886_EXTRACTION_CANDIDATES,
    extractionCandidateCount: RES_0886_EXTRACTION_CANDIDATES.length,
    extractionGate: {
      officialSourceRequired: true,
      sourceAnchorRequired: true,
      humanReviewRequired: true,
      partialExtractionMayBePublishedAsApproved: false,
      sectionHeadingOnlyMayBePromoted: false,
      missingRegulatoryCodeMayBeInvented: false,
    },
    mappingPolicy: {
      canonicalEntityBoundary: RES_0886_TAXONOMY_ENVELOPE.canonicalEntityBoundary,
      mappingPolicy: RES_0886_TAXONOMY_ENVELOPE.mappingPolicy,
      requiredMappingFields: RES_0886_TAXONOMY_ENVELOPE.requiredMappingFields,
    },
    policy: REGULATORY_INSTALLATION_CONTEXT_POLICY,
  };
}
