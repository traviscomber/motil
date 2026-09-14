export type AttentionFactor = {
  code: string;
  label: string;
  weight: number;
};

export type AttentionResult = {
  score: number;
  level: 'P1' | 'P2' | 'P3';
  factors: AttentionFactor[];
};

type DecisionCaseLike = {
  status?: string | null;
  target_domain?: string | null;
  evidence_refs?: unknown;
  contradictions?: unknown;
  missing_evidence?: unknown;
  last_revalidated_at?: string | null;
};

function decisionKeyFromRefs(refs: unknown): string {
  if (!Array.isArray(refs)) return '';
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).decisionKey === 'string') return (ref as any).decisionKey;
  }
  return '';
}

function sourceSeverityFromRefs(refs: unknown): string | null {
  if (!Array.isArray(refs)) return null;
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && typeof (ref as any).severity === 'string') return String((ref as any).severity).toLowerCase();
  }
  return null;
}

function add(factors: AttentionFactor[], code: string, label: string, weight: number) {
  factors.push({ code, label, weight });
}

export function deriveDecisionAttention(row: DecisionCaseLike, now = new Date()): AttentionResult {
  const factors: AttentionFactor[] = [];
  let score = 15;
  add(factors, 'open_case', 'Caso operacional abierto', 15);

  const key = decisionKeyFromRefs(row.evidence_refs);
  const severity = sourceSeverityFromRefs(row.evidence_refs);

  if (severity) {
    const sourceWeight = ['critical', 'critico', 'crítico'].includes(severity)
      ? 45
      : ['high', 'alto', 'error'].includes(severity)
        ? 30
        : ['medium', 'medio', 'warning', 'warn'].includes(severity)
          ? 10
          : 0;
    if (sourceWeight > 0) {
      score += sourceWeight;
      add(factors, 'source_severity', `Severidad explícita de la fuente: ${severity}`, sourceWeight);
    }
  }

  if (key.startsWith('operational:maintenance:closure:')) {
    score += 30;
    add(factors, 'workflow_blocker', 'La evidencia bloquea el cierre de una OT', 30);
  } else if (key.startsWith('operational:maintenance:preventive:')) {
    score += 25;
    add(factors, 'preventive_due', 'Pauta preventiva en condición de atención', 25);
  } else if (key.startsWith('operational:procurement:work-order-supply:')) {
    score += 28;
    add(factors, 'supply_blocker', 'Dependencia de abastecimiento ligada a una OT', 28);
  } else if (key.startsWith('operational:inventory:work-order-shortage:')) {
    score += 26;
    add(factors, 'material_shortage', 'Faltante material ligado a una OT', 26);
  } else if (key.startsWith('operational:geology:readiness:')) {
    score += 15;
    add(factors, 'evidence_readiness', 'Geometría o evidencia geológica requiere validación', 15);
  } else if (key.startsWith('operational:production:fidelity:')) {
    score += 12;
    add(factors, 'source_fidelity', 'Excepción de fidelidad en fuente de Producción', 12);
  } else if (key.startsWith('operational:finance:alert:')) {
    score += 8;
    add(factors, 'finance_exception', 'Excepción financiera canónica abierta', 8);
  } else if (key.startsWith('operational:hse:commitments-without-due-date')) {
    score += 6;
    add(factors, 'hse_governance_gap', 'Brecha de gobernanza HSE sin vencimiento inferido', 6);
  }

  const contradictions = Array.isArray(row.contradictions) ? row.contradictions.length : 0;
  if (contradictions > 0) {
    const weight = Math.min(12, contradictions * 4);
    score += weight;
    add(factors, 'contradictions', `${contradictions} contradicción(es) explícita(s)`, weight);
  }

  const missing = Array.isArray(row.missing_evidence) ? row.missing_evidence.length : 0;
  if (missing > 0) {
    const weight = Math.min(3, missing);
    score += weight;
    add(factors, 'missing_evidence', `${missing} evidencia(s) faltante(s); aumenta necesidad de validación, no impacto`, weight);
  }

  if (!row.last_revalidated_at) {
    score += 3;
    add(factors, 'not_revalidated', 'Caso aún no revalidado', 3);
  } else {
    const revalidated = new Date(row.last_revalidated_at);
    if (!Number.isNaN(revalidated.getTime())) {
      const ageDays = (now.getTime() - revalidated.getTime()) / 86_400_000;
      if (ageDays > 7) {
        score += 2;
        add(factors, 'stale_revalidation', 'Revalidación con más de 7 días', 2);
      }
    }
  }

  if (row.status === 'acknowledged') {
    score -= 5;
    add(factors, 'acknowledged', 'Caso ya reconocido por una persona', -5);
  }

  score = Math.max(0, Math.min(100, score));
  const level: AttentionResult['level'] = score >= 65 ? 'P1' : score >= 40 ? 'P2' : 'P3';
  return { score, level, factors };
}
