export type TemporalTrendKind = 'appeared' | 'improved' | 'worsened' | 'unchanged' | 'recurred' | 'resolved' | 'changed';

export type DecisionCaseState = {
  status?: string | null;
  evidence_refs?: unknown;
  missing_evidence?: unknown;
  contradictions?: unknown;
  last_revalidated_at?: string | null;
};

export type DecisionCaseEventRow = {
  id: string;
  decision_case_id: string;
  source_domain: string;
  target_domain: string;
  event_kind: 'created' | 'updated';
  before_state: DecisionCaseState | null;
  after_state: DecisionCaseState;
  occurred_at: string;
};

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function closed(status: string | null | undefined) {
  return status === 'resolved' || status === 'closed';
}

export function classifyDecisionCaseTrend(event: DecisionCaseEventRow): TemporalTrendKind {
  if (event.event_kind === 'created' || !event.before_state) return 'appeared';

  const before = event.before_state;
  const after = event.after_state;
  if (closed(before.status) && !closed(after.status)) return 'recurred';
  if (!closed(before.status) && closed(after.status)) return 'resolved';

  const missingDelta = count(after.missing_evidence) - count(before.missing_evidence);
  const contradictionDelta = count(after.contradictions) - count(before.contradictions);
  const evidenceDelta = count(after.evidence_refs) - count(before.evidence_refs);

  if (missingDelta < 0 || contradictionDelta < 0 || (evidenceDelta > 0 && missingDelta <= 0 && contradictionDelta <= 0)) {
    return 'improved';
  }
  if (missingDelta > 0 || contradictionDelta > 0) return 'worsened';

  const sameTrackedState =
    String(before.status || '') === String(after.status || '') &&
    missingDelta === 0 && contradictionDelta === 0 && evidenceDelta === 0 &&
    String(before.last_revalidated_at || '') === String(after.last_revalidated_at || '');

  return sameTrackedState ? 'unchanged' : 'changed';
}

export const TEMPORAL_TREND_POLICY = {
  authority: 'derived_read_only',
  semantics: 'Trend labels compare explicit Decision Case lifecycle and evidence-state snapshots. Improved/worsened describe evidence state only, not business impact or root cause.',
  recurrence: 'Recurred is emitted only when a previously resolved/closed case becomes active again.',
  prediction: false,
  mutation: false,
} as const;