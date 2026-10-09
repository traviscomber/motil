import { createHash } from 'node:crypto';

/**
 * Stable UUID source key for one organization's regulatory review request.
 * Unique(organization_id, source_type, source_id) in legal_cases protects retries
 * and concurrent clicks; this identifier is NOT a regulated certificate number.
 * @param {string} organizationId
 * @param {string} obligationId
 */
export function engineeringReviewSourceId(organizationId, obligationId) {
  const hex = createHash('sha1')
    .update('motil:engineering-review:v1:' + organizationId + ':' + obligationId)
    .digest('hex').slice(0, 32);
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-5' +
    hex.slice(13, 16) + '-' + variant + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}

/**
 * Data is an inventory of AVAILABLE SOURCE METADATA, not legal compliance.
 * A production plan is not a SERNAGEOMIN project resolution. Historical
 * drilling sources are not surveyed mine drawings.
 *
 * @param {Array<{id:string,title:string,legalBasis:string[],businessOwner:string,priority:string,
 * expectedEvidence:string[],nextAction:string,sourceUrl:string,applicabilityNote:string}>} obligations
 * @param {string} organizationId
 * @param {Array<Record<string,any>>} docs
 * @param {number|null} docTotal
 * @param {Array<Record<string,any>>} sources
 * @param {number|null} sourceTotal
 * @param {Array<Record<string,any>>} reviewCases
 */
export function buildEngineeringRegulatoryDossier(obligations, organizationId, docs, docTotal, sources, sourceTotal, reviewCases) {
  const caseIndex = new Map(reviewCases.map(item => [item.source_id, item]));
  const requirements = obligations.map(item => {
    const caseRecord = caseIndex.get(engineeringReviewSourceId(organizationId, item.id));
    return {
      id: item.id, title: item.title, legalBasis: item.legalBasis,
      businessOwner: item.businessOwner, nextAction: item.nextAction,
      expectedEvidence: item.expectedEvidence, sourceUrl: item.sourceUrl,
      applicabilityNote: item.applicabilityNote,
      documentVerification: 'not_assessed_by_legal',
      reviewCase: caseRecord ? {
        id: caseRecord.id, status: caseRecord.status,
        evidenceStatus: caseRecord.evidence_status,
      } : null,
    };
  });
  const exactCount = (value) => Number.isInteger(value) && value >= 0 ? value : null;
  const documents = docs.map(item => ({
    id: item.id, name: item.document_name || 'Sin nombre',
    module: item.module, category: item.category,
    version: item.version ?? null, status: item.status || null,
    provenance: item.provenance_status || null,
    validUntil: item.valid_until || null,
    classification: 'technical_candidate_unverified',
  }));
  const historicalSources = sources.map(item => ({
    id: item.id, file: item.source_file || 'Sin nombre',
    kind: item.source_kind, role: item.canonical_role,
    periodStart: item.period_start ?? null, periodEnd: item.period_end ?? null,
    classification: 'operational_context_only',
  }));
  return {
    requirements,
    summary: {
      requiredReviews: requirements.length,
      requestedReviews: requirements.filter(x => x.reviewCase !== null).length,
      technicalDocumentCount: exactCount(docTotal),
      technicalDocumentRows: documents.length,
      technicalDocumentsComplete: exactCount(docTotal) !== null && documents.length === docTotal,
      historicalSourceCount: exactCount(sourceTotal),
      historicalSourceRows: historicalSources.length,
      historicalSourcesComplete: exactCount(sourceTotal) !== null && historicalSources.length === sourceTotal,
    },
    documents, historicalSources,
    policy: {
      legalApplicabilityVerified: false,
      anyComplianceVerdictCalculated: false,
      linkedEvidenceVerifiedByLegal: false,
      documentsMayExistOutsideThisInventory: true,
      owner: 'Legal valida aplicabilidad y cierre; Ingeniería prepara antecedentes.',
    },
  };
}
