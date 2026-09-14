export type SourceConfidence = 'high' | 'medium' | 'low' | 'unknown';
export type SourceFreshness = 'fresh' | 'aging' | 'stale' | 'unknown';

export type SourceHealthInput = {
  source: string;
  domain: string;
  observedThrough: string | null;
  available: boolean;
  qualityHold?: boolean;
  incomplete?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function deriveSourceHealth(input: SourceHealthInput, now = new Date()) {
  if (!input.available || !input.observedThrough) {
    return {
      ...input,
      freshness: 'unknown' as SourceFreshness,
      confidence: 'unknown' as SourceConfidence,
      ageDays: null,
      reasons: ['Fuente o timestamp de frescura no disponible.'],
    };
  }

  const observed = new Date(input.observedThrough);
  if (!Number.isFinite(observed.getTime())) {
    return {
      ...input,
      freshness: 'unknown' as SourceFreshness,
      confidence: 'unknown' as SourceConfidence,
      ageDays: null,
      reasons: ['Timestamp de frescura inválido.'],
    };
  }

  const ageDays = Math.max(0, (now.getTime() - observed.getTime()) / DAY_MS);
  const freshness: SourceFreshness = ageDays <= 2 ? 'fresh' : ageDays <= 7 ? 'aging' : 'stale';
  const reasons: string[] = [`Última evidencia visible hace ${ageDays.toFixed(1)} días.`];
  if (input.qualityHold) reasons.push('La fuente reporta un estado HOLD o equivalente.');
  if (input.incomplete) reasons.push('La fuente reporta cobertura incompleta o parcial.');

  let confidence: SourceConfidence = 'high';
  if (input.qualityHold || freshness === 'stale') confidence = 'low';
  else if (input.incomplete || freshness === 'aging') confidence = 'medium';

  return { ...input, freshness, confidence, ageDays: Number(ageDays.toFixed(2)), reasons };
}

export const SOURCE_CONFIDENCE_POLICY = {
  semantics: 'Confidence is a deterministic presentation label derived from source availability, freshness and explicit quality/coverage flags. It is not a probability of correctness.',
  freshnessWindows: { freshDays: 2, agingDays: 7 },
  missingBoundary: 'Missing source or freshness metadata returns unknown, never zero or high confidence.',
  mutation: false,
} as const;
