export type DecisionTimelineRow = {
  id: string;
  title: string;
  status: string;
  created_by_user_id: string;
  acknowledged_by_user_id: string | null;
  last_revalidated_by_user_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
  last_revalidated_at: string | null;
  updated_at: string;
  recommended_human_action: string | null;
  last_revalidation_evidence_refs: unknown;
};

export type DecisionTimelineEvent = {
  kind: 'detected' | 'reviewed' | 'revalidated' | 'resolved' | 'updated';
  at: string;
  actorUserId: string | null;
  authority: 'advisory_only' | 'human_action';
  detail: string;
  evidenceRefs?: unknown;
};

export function deriveDecisionCaseTimeline(row: DecisionTimelineRow): DecisionTimelineEvent[] {
  const events: DecisionTimelineEvent[] = [
    {
      kind: 'detected',
      at: row.created_at,
      actorUserId: row.created_by_user_id,
      authority: 'advisory_only',
      detail: 'Decision Case detectado y persistido.',
    },
  ];

  if (row.acknowledged_at) {
    events.push({
      kind: 'reviewed',
      at: row.acknowledged_at,
      actorUserId: row.acknowledged_by_user_id,
      authority: 'human_action',
      detail: 'Caso reconocido por un usuario autorizado.',
    });
  }

  if (row.last_revalidated_at) {
    events.push({
      kind: 'revalidated',
      at: row.last_revalidated_at,
      actorUserId: row.last_revalidated_by_user_id,
      authority: 'advisory_only',
      detail: 'Caso revalidado contra evidencia vigente.',
      evidenceRefs: row.last_revalidation_evidence_refs,
    });
  }

  const terminal = row.status === 'resolved' || row.status === 'closed' || row.status === 'archived';
  const updateMatchesKnownEvent = [row.created_at, row.acknowledged_at, row.last_revalidated_at].filter(Boolean).includes(row.updated_at);
  if (terminal) {
    events.push({
      kind: 'resolved',
      at: row.updated_at,
      actorUserId: row.last_revalidated_by_user_id || row.acknowledged_by_user_id,
      authority: 'human_action',
      detail: `Caso en estado ${row.status}.`,
    });
  } else if (!updateMatchesKnownEvent && row.updated_at !== row.created_at) {
    events.push({
      kind: 'updated',
      at: row.updated_at,
      actorUserId: null,
      authority: 'advisory_only',
      detail: 'El registro cambió; el esquema actual no conserva un actor explícito para esta actualización.',
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export const DECISION_TIMELINE_POLICY = {
  evidenceBoundary: 'Timeline is derived only from persisted Decision Case lifecycle fields; missing actor or comment is not invented.',
  authorityBoundary: 'Recommendation and revalidation remain advisory; human acknowledgement/resolution is shown separately.',
  mutation: false,
} as const;
