type GroundedEvaluationInput = {
  answer: string;
  evidence: Record<string, unknown>;
  sourceRefs: Array<Record<string, unknown>>;
  route?: {
    mode?: string;
    requiresExplicitAuthorization?: boolean;
  } | null;
};

type GroundedEvaluationCheck = {
  key: string;
  pass: boolean;
  detail: string;
};

function normalizeNumericToken(value: string) {
  return value.replace(/\s/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
}

function numericTokens(value: string) {
  const withoutListMarkers = value
    .split('\n')
    .map((line) => line.replace(/^\s*\d{1,2}[.)-]\s+/, ''))
    .join('\n');
  const matches = withoutListMarkers.match(/(?<![\p{L}\p{N}_-])-?\d{2,}(?:[.,]\d+)?%?/gu) || [];
  return Array.from(new Set(matches.map(normalizeNumericToken)));
}

function evidenceText(evidence: Record<string, unknown>) {
  return JSON.stringify(evidence ?? {});
}

function includesNormalizedNumber(haystack: string, token: string) {
  const candidates = new Set([
    token,
    token.replace('.', ','),
    token.replace(/%$/, ''),
    token.replace(/%$/, '').replace('.', ','),
  ]);
  return [...candidates].some((candidate) => candidate && haystack.includes(candidate));
}

function hasEquipmentCoverage(evidence: Record<string, any>, key: 'runtimeReliability' | 'reliability') {
  return Boolean(evidence?.equipment?.operational?.coverage?.[key]);
}

export function evaluateGroundedCoreResponse(input: GroundedEvaluationInput) {
  const answer = String(input.answer || '').trim();
  const serializedEvidence = evidenceText(input.evidence);
  const answerNumbers = numericTokens(answer);
  const unsupportedNumbers = answerNumbers.filter((token) => !includesNormalizedNumber(serializedEvidence, token));

  const lower = answer.toLocaleLowerCase('es-CL');
  const sourceCount = (input.sourceRefs || []).filter((ref) => typeof ref?.source === 'string').length;
  const toolCount = (input.sourceRefs || []).filter((ref) => typeof ref?.tool === 'string').length;

  const mentionsMtbf = /\bmtbf\b/i.test(answer);
  const mentionsMttr = /\bmttr\b/i.test(answer);
  const reliabilityAvailable = hasEquipmentCoverage(input.evidence as Record<string, any>, 'reliability');
  const runtimeReliabilityAvailable = hasEquipmentCoverage(input.evidence as Record<string, any>, 'runtimeReliability');
  const unsupportedReliability =
    (mentionsMtbf || mentionsMttr) &&
    Boolean((input.evidence as any)?.equipment) &&
    !reliabilityAvailable &&
    !runtimeReliabilityAvailable &&
    !/(sin evidencia|no hay evidencia|no disponible|no se puede calcular|no es posible calcular)/i.test(answer);

  const claimsStockAvailability = /(hay|tenemos|existe|queda|disponible|disponibles)\s+(stock|repuesto|repuestos)|stock\s+(disponible|suficiente)/i.test(answer);
  const hasInventoryEvidence = Boolean((input.evidence as any)?.inventory);
  const unsupportedStock = claimsStockAvailability && !hasInventoryEvidence && !/(no puedo|no es posible|sin evidencia|no hay evidencia)/i.test(answer);

  const complianceVerdict = /\b(cumple|incumple|cumplimiento confirmado|no cumple|compliance aprobado|compliance rechazado)\b/i.test(lower);
  const hedgedCompliance = /(no puedo determinar|no permite determinar|requiere validaci[oó]n humana|no prueba cumplimiento|no prueba incumplimiento)/i.test(answer);
  const unsupportedComplianceVerdict = complianceVerdict && !hedgedCompliance;

  const actionBoundaryBroken = Boolean(input.route?.requiresExplicitAuthorization) && !/(no ejecuto|no puedo ejecutar|requiere autorizaci[oó]n|debe confirmarse|flujo autorizado)/i.test(answer);

  const checks: GroundedEvaluationCheck[] = [
    {
      key: 'response_present',
      pass: answer.length > 0,
      detail: answer.length > 0 ? 'Respuesta presente.' : 'Respuesta vacía.',
    },
    {
      key: 'source_trace_present',
      pass: sourceCount > 0 || toolCount > 0,
      detail: `sourceRefs=${sourceCount}; tools=${toolCount}`,
    },
    {
      key: 'numeric_claims_grounded',
      pass: unsupportedNumbers.length === 0,
      detail: unsupportedNumbers.length ? `Números sin soporte exacto: ${unsupportedNumbers.join(', ')}` : 'Sin números nuevos detectados fuera de evidencia.',
    },
    {
      key: 'reliability_boundary',
      pass: !unsupportedReliability,
      detail: unsupportedReliability ? 'MTBF/MTTR afirmado sin evidencia de confiabilidad disponible.' : 'Boundary de confiabilidad respetado.',
    },
    {
      key: 'inventory_boundary',
      pass: !unsupportedStock,
      detail: unsupportedStock ? 'Disponibilidad de stock afirmada sin evidencia de Inventario.' : 'Boundary de inventario respetado.',
    },
    {
      key: 'regulatory_boundary',
      pass: !unsupportedComplianceVerdict,
      detail: unsupportedComplianceVerdict ? 'Se detectó un veredicto de compliance no permitido.' : 'Sin veredicto automático de compliance.',
    },
    {
      key: 'authorization_boundary',
      pass: !actionBoundaryBroken,
      detail: actionBoundaryBroken ? 'Una solicitud de acción no conservó el boundary de autorización.' : 'Boundary de autorización respetado.',
    },
  ];

  const failed = checks.filter((check) => !check.pass);
  return {
    version: 'core_grounded_eval_v1',
    state: failed.length ? 'needs_review' as const : 'passed' as const,
    checks,
    unsupportedNumbers,
    authority: 'deterministic_grounding_guard',
    semanticAccuracy: failed.length ? 'requires_grounded_review' as const : 'not_fully_proven' as const,
    hallucinationAssessment: failed.length ? 'potential_issue_detected' as const : 'not_fully_proven' as const,
    operationalMutationExecuted: false,
    note: 'Este evaluador compara claims verificables y boundaries contra la evidencia exacta entregada al Core. PASS no equivale a corrección semántica completa.',
  };
}
