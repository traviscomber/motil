export type CoreEvaluationScenario = {
  id: string;
  prompt: string;
  requiredDomains: string[];
  expectedSpecialist?: string;
  evaluationFocus: string[];
};

export const CORE_EVALUATION_SCENARIOS: CoreEvaluationScenario[] = [
  {
    id: 'blocked_work_orders',
    prompt: '¿Qué OT están bloqueadas?',
    requiredDomains: ['maintenance'],
    evaluationFocus: ['canonical_sources', 'permissions', 'traceability', 'usefulness'],
  },
  {
    id: 'attention_today',
    prompt: '¿Qué requiere atención hoy?',
    requiredDomains: [],
    evaluationFocus: ['priority_grounding', 'source_freshness', 'traceability', 'usefulness'],
  },
  {
    id: 'parts_for_work_orders',
    prompt: '¿Tenemos repuestos para estas OT?',
    requiredDomains: ['maintenance', 'inventory'],
    evaluationFocus: ['cross_domain_scope', 'canonical_sources', 'no_stock_inference', 'usefulness'],
  },
  {
    id: 'equipment_status',
    prompt: '¿Qué está pasando con el equipo X?',
    requiredDomains: ['maintenance'],
    expectedSpecialist: 'equipment',
    evaluationFocus: ['equipment_resolution', 'evidence_coverage', 'no_failure_prediction', 'traceability'],
  },
  {
    id: 'geology_review',
    prompt: '¿Qué sondajes requieren revisión?',
    requiredDomains: ['geology'],
    evaluationFocus: ['canonical_sources', 'permissions', 'evidence_gaps', 'usefulness'],
  },
];

type CoreRunTelemetry = {
  specialist?: string | null;
  source_count?: number | null;
  tool_count?: number | null;
  latency_ms?: number | null;
  response_char_count?: number | null;
};

export function evaluateRunTelemetry(run: CoreRunTelemetry, scenario?: CoreEvaluationScenario) {
  const checks = {
    responsePresent: Number(run.response_char_count || 0) > 0,
    sourceTracePresent: Number(run.source_count || 0) > 0,
    toolTracePresent: Number(run.tool_count || 0) > 0,
    latencyMeasured: Number.isFinite(run.latency_ms),
    specialistMatched: scenario?.expectedSpecialist
      ? run.specialist === scenario.expectedSpecialist
      : true,
  };

  return {
    checks,
    structuralPass: Object.values(checks).every(Boolean),
    semanticAccuracy: 'requires_grounded_review' as const,
    hallucinationAssessment: 'requires_grounded_review' as const,
    usefulnessAssessment: 'requires_human_or_grounded_review' as const,
  };
}

export const CORE_EVALUATION_POLICY = {
  automatedAuthority: 'structural_observability_only',
  neverTreatTelemetryAsAnswerCorrectness: true,
  semanticAccuracyRequiresGroundedReview: true,
  hallucinationAssessmentRequiresEvidenceComparison: true,
  usefulnessRequiresHumanOrGroundedReview: true,
} as const;
