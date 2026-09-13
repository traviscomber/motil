export type AttentionCase = {
  id?: string;
  target_domain?: string | null;
  source_domain?: string | null;
  title?: string | null;
  summary?: string | null;
  evidence_refs?: unknown;
  uncertainty?: string | null;
  contradictions?: unknown;
  missing_evidence?: unknown;
  recommended_human_action?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AttentionFactor = {
  key: 'impact' | 'urgency' | 'blocking' | 'uncertainty' | 'evidence';
  points: number;
  reason: string;
};

export type AttentionAssessment = {
  score: number;
  level: 'P1' | 'P2' | 'P3';
  factors: AttentionFactor[];
  policy: string;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function evidenceObjects(value: unknown): Record<string, unknown>[] {
  return asArray(value).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
}

function text(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function numericEvidence(refs: Record<string, unknown>[], keys: string[]) {
  for (const ref of refs) {
    for (const key of keys) {
      const raw = ref[key];
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
    }
  }
  return null;
}

function stringEvidence(refs: Record<string, unknown>[], keys: string[]) {
  for (const ref of refs) {
    for (const key of keys) {
      const raw = ref[key];
      if (typeof raw === 'string' && raw.trim()) return raw.toLowerCase();
    }
  }
  return null;
}

export function assessOperationalAttention(row: AttentionCase, now = new Date()): AttentionAssessment {
  const refs = evidenceObjects(row.evidence_refs);
  const factors: AttentionFactor[] = [];
  const key = refs.map((ref) => String(ref.decisionKey || '')).find(Boolean) || '';
  const domain = String(row.target_domain || '').toLowerCase();
  const combinedText = `${text(row.title)} ${text(row.summary)} ${text(row.recommended_human_action)}`;

  let impact = 10;
  if (domain === 'maintenance' || domain === 'production' || domain === 'hse') impact = 20;
  else if (domain === 'inventory' || domain === 'procurement' || domain === 'finance') impact = 16;
  else if (domain === 'geology') impact = 14;
  factors.push({ key: 'impact', points: impact, reason: `Dominio ${domain || 'no informado'}; ponderación base sin inferir impacto económico ni de seguridad.` });

  let urgency = 0;
  const remainingHours = numericEvidence(refs, ['remainingHours', 'remaining_hours']);
  if (remainingHours != null && remainingHours <= 0) {
    urgency = 20;
    factors.push({ key: 'urgency', points: urgency, reason: `La evidencia registra margen de horómetro ${remainingHours} h.` });
  } else {
    const latestExceptionDate = stringEvidence(refs, ['latestExceptionDate']);
    if (latestExceptionDate) {
      const ageDays = Math.floor((now.getTime() - new Date(`${latestExceptionDate.slice(0, 10)}T00:00:00Z`).getTime()) / 86400000);
      if (Number.isFinite(ageDays) && ageDays >= 0) {
        urgency = ageDays >= 14 ? 12 : ageDays >= 7 ? 8 : 4;
        factors.push({ key: 'urgency', points: urgency, reason: `Última excepción fechada hace ${ageDays} día(s); sólo se usa antigüedad explícita de la fuente.` });
      }
    }
  }
  if (!factors.some((factor) => factor.key === 'urgency')) factors.push({ key: 'urgency', points: 0, reason: 'No hay señal explícita de vencimiento o antigüedad utilizable; no se infiere urgencia.' });

  let blocking = 0;
  const supplyStatus = stringEvidence(refs, ['supplyChainStatus', 'supply_chain_status']);
  const readyToClose = refs.map((ref) => ref.readyToClose ?? ref.ready_to_close).find((value) => typeof value === 'boolean');
  if (key.includes(':closure:') || readyToClose === false) blocking = 18;
  else if (supplyStatus && ['shortage_without_request', 'waiting_procurement', 'waiting_delivery'].includes(supplyStatus)) blocking = 16;
  else if (/bloquead|faltante|sin solicitud|sin orden|pendiente de entrega/.test(combinedText)) blocking = 8;
  factors.push({ key: 'blocking', points: blocking, reason: blocking > 0 ? 'La evidencia/caso identifica una dependencia o condición de bloqueo explícita.' : 'No existe bloqueo explícito en la evidencia disponible.' });

  const contradictionCount = asArray(row.contradictions).length;
  const missingCount = asArray(row.missing_evidence).length;
  const uncertaintyPoints = Math.min(12, contradictionCount * 4 + missingCount * 2 + (row.uncertainty ? 2 : 0));
  factors.push({ key: 'uncertainty', points: uncertaintyPoints, reason: `${contradictionCount} contradicción(es), ${missingCount} evidencia(s) faltante(s)${row.uncertainty ? ' y una nota explícita de incertidumbre' : ''}.` });

  let evidence = 4;
  if (refs.length >= 2) evidence = 8;
  if (refs.length === 0) evidence = 0;
  factors.push({ key: 'evidence', points: evidence, reason: `${refs.length} referencia(s) de evidencia persistida; este factor premia trazabilidad, no severidad.` });

  const score = Math.max(0, Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0)));
  const level: AttentionAssessment['level'] = score >= 60 ? 'P1' : score >= 35 ? 'P2' : 'P3';

  return {
    score,
    level,
    factors,
    policy: 'Score determinístico y advisory. Factores sin evidencia aportan 0; no estima probabilidad, costo, seguridad ni causa raíz no registrada.',
  };
}
