import { RES_0886_EXTRACTION_CANDIDATES } from '@/lib/intelligence/regulatory-installation-context';

export type RegulatoryMappingDecision = 'requires_review' | 'accepted' | 'rejected';
export type RegulatoryMappingEntityType = 'asset' | 'hse_facility';

export const REGULATORY_MAPPING_REVIEW_POLICY = {
  authority: 'human_review_only',
  operationalBoundary: 'A regulatory mapping never overwrites canonical MOTIL identifiers or operational state.',
  complianceBoundary: 'Accepting a mapping does not prove legal compliance, applicability, certification or reportability.',
  acceptanceGate: 'Accepted mappings require a stable official source anchor and an exact regulatory code.',
  inspectionBoundary: 'Unscoped legacy inspections remain excluded until tenant isolation is proven.',
} as const;

export function findRes0886Candidate(regulatoryLabel: string) {
  const normalized = regulatoryLabel.trim().toLocaleUpperCase('es-CL');
  return RES_0886_EXTRACTION_CANDIDATES.find(
    (candidate) => candidate.regulatoryLabel.toLocaleUpperCase('es-CL') === normalized,
  ) || null;
}

export function validateRegulatoryMappingDecision(input: {
  regulatoryLabel: string;
  decision: RegulatoryMappingDecision;
}) {
  const candidate = findRes0886Candidate(input.regulatoryLabel);
  if (!candidate) {
    return { ok: false as const, code: 'candidate_not_found', message: 'El candidato regulatorio no existe en la extracción RES 0886 vigente.' };
  }

  if (
    input.decision === 'accepted'
    && (candidate.sourceAnchorStatus !== 'stable_page_anchor' || !candidate.regulatoryCode?.trim())
  ) {
    return {
      ok: false as const,
      code: 'acceptance_gate_not_met',
      message: 'Este mapping aún no puede aceptarse: falta un page anchor oficial estable y/o el código regulatorio exacto.',
      candidate,
    };
  }

  return { ok: true as const, candidate };
}
