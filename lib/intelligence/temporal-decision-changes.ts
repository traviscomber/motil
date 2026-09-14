export type TemporalDecisionChangeKind = 'appeared' | 'acknowledged' | 'revalidated' | 'resolved' | 'changed';

export type TemporalDecisionCaseRow = {
  id: string;
  source_domain: string;
  target_domain: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  last_revalidated_at: string | null;
  recommended_human_action: string | null;
};

export type TemporalDecisionChange = {
  caseId: string;
  kind: TemporalDecisionChangeKind;
  at: string;
  sourceDomain: string;
  targetDomain: string;
  title: string;
  status: string;
  summary: string | null;
  recommendedHumanAction: string | null;
};

function after(value: string | null | undefined, since: Date) {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed > since;
}

export function deriveTemporalDecisionChanges(rows: TemporalDecisionCaseRow[], sinceIso: string) {
  const since = new Date(sinceIso);
  if (!Number.isFinite(since.getTime())) throw new Error('invalid_since');

  const changes: TemporalDecisionChange[] = [];

  for (const row of rows) {
    if (after(row.created_at, since)) {
      changes.push({
        caseId: row.id,
        kind: 'appeared',
        at: row.created_at,
        sourceDomain: row.source_domain,
        targetDomain: row.target_domain,
        title: row.title,
        status: row.status,
        summary: row.summary,
        recommendedHumanAction: row.recommended_human_action,
      });
    }

    if (after(row.acknowledged_at, since)) {
      changes.push({
        caseId: row.id,
        kind: 'acknowledged',
        at: row.acknowledged_at!,
        sourceDomain: row.source_domain,
        targetDomain: row.target_domain,
        title: row.title,
        status: row.status,
        summary: row.summary,
        recommendedHumanAction: row.recommended_human_action,
      });
    }

    if (after(row.last_revalidated_at, since)) {
      changes.push({
        caseId: row.id,
        kind: 'revalidated',
        at: row.last_revalidated_at!,
        sourceDomain: row.source_domain,
        targetDomain: row.target_domain,
        title: row.title,
        status: row.status,
        summary: row.summary,
        recommendedHumanAction: row.recommended_human_action,
      });
    }

    const updatedAfter = after(row.updated_at, since);
    const knownEventAt = [row.created_at, row.acknowledged_at, row.last_revalidated_at].filter(Boolean);
    const updateAlreadyExplained = knownEventAt.some((value) => value === row.updated_at);
    if (updatedAfter && !updateAlreadyExplained) {
      changes.push({
        caseId: row.id,
        kind: row.status === 'resolved' || row.status === 'closed' ? 'resolved' : 'changed',
        at: row.updated_at,
        sourceDomain: row.source_domain,
        targetDomain: row.target_domain,
        title: row.title,
        status: row.status,
        summary: row.summary,
        recommendedHumanAction: row.recommended_human_action,
      });
    }
  }

  return changes.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const TEMPORAL_DECISION_POLICY = {
  authority: 'derived_read_only',
  semantics: 'Changes are derived from Decision Case timestamps and statuses; they do not infer root cause, severity or business impact.',
  mutation: false,
} as const;
