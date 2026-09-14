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

export type DecisionHumanActionRow = {
  id: string;
  actor_user_id: string;
  action_kind: 'acknowledged' | 'archived';
  from_status: string;
  to_status: string;
  comment: string | null;
  recommendation_snapshot: string | null;
  evidence_refs_snapshot: unknown;
  missing_evidence_snapshot: unknown;
  contradictions_snapshot: unknown;
  created_at: string;
};

export type DecisionTimelineEvent = {
  kind: 'detected' | 'reviewed' | 'revalidated' | 'resolved' | 'archived' | 'updated';
  at: string;
  actorUserId: string | null;
  authority: 'advisory_only' | 'human_action';
  detail: string;
  evidenceRefs?: unknown;
  comment?: string | null;
  recommendationSnapshot?: string | null;
  source: 'case_lifecycle' | 'human_action_log';
};

function explicitHumanEvents(actions: DecisionHumanActionRow[]): DecisionTimelineEvent[] {
  return actions.map((action) => ({
    kind: action.action_kind === 'acknowledged' ? 'reviewed' : 'archived',
    at: action.created_at,
    actorUserId: action.actor_user_id,
    authority: 'human_action',
    detail: action.action_kind === 'acknowledged'
      ? `Caso reconocido: ${action.from_status} → ${action.to_status}.`
      : `Caso archivado: ${action.from_status} → ${action.to_status}.`,
    evidenceRefs: action.evidence_refs_snapshot,
    comment: action.comment,
    recommendationSnapshot: action.recommendation_snapshot,
    source: 'human_action_log',
  }));
}

export function deriveDecisionCaseTimeline(
  row: DecisionTimelineRow,
  humanActions: DecisionHumanActionRow[] = [],
): DecisionTimelineEvent[] {
  const events: DecisionTimelineEvent[] = [
    {
      kind: 'detected',
      at: row.created_at,
      actorUserId: row.created_by_user_id,
      authority: 'advisory_only',
      detail: 'Decision Case detectado y persistido.',
      source: 'case_lifecycle',
    },
  ];

  const explicit = explicitHumanEvents(humanActions);
  const hasExplicitAcknowledgement = humanActions.some((action) => action.action_kind === 'acknowledged');
  const hasExplicitArchive = humanActions.some((action) => action.action_kind === 'archived');

  if (row.acknowledged_at && !hasExplicitAcknowledgement) {
    events.push({
      kind: 'reviewed',
      at: row.acknowledged_at,
      actorUserId: row.acknowledged_by_user_id,
      authority: 'human_action',
      detail: 'Caso reconocido por un usuario autorizado. Registro legacy sin comentario/snapshot v2.',
      source: 'case_lifecycle',
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
      source: 'case_lifecycle',
    });
  }

  const terminalResolved = row.status === 'resolved' || row.status === 'closed';
  const terminalArchived = row.status === 'archived';
  const updateMatchesKnownEvent = [row.created_at, row.acknowledged_at, row.last_revalidated_at].filter(Boolean).includes(row.updated_at);
  if (terminalResolved) {
    events.push({
      kind: 'resolved',
      at: row.updated_at,
      actorUserId: row.last_revalidated_by_user_id || row.acknowledged_by_user_id,
      authority: 'human_action',
      detail: `Caso en estado ${row.status}. El esquema actual no conserva un action log v2 para esta transición.`,
      source: 'case_lifecycle',
    });
  } else if (terminalArchived && !hasExplicitArchive) {
    events.push({
      kind: 'archived',
      at: row.updated_at,
      actorUserId: null,
      authority: 'human_action',
      detail: 'Caso archivado. Registro legacy sin actor/comentario/snapshot v2 verificable.',
      source: 'case_lifecycle',
    });
  } else if (!terminalArchived && !updateMatchesKnownEvent && row.updated_at !== row.created_at) {
    events.push({
      kind: 'updated',
      at: row.updated_at,
      actorUserId: null,
      authority: 'advisory_only',
      detail: 'El registro cambió; el esquema actual no conserva un actor explícito para esta actualización.',
      source: 'case_lifecycle',
    });
  }

  events.push(...explicit);
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export const DECISION_TIMELINE_POLICY = {
  evidenceBoundary: 'Timeline uses persisted lifecycle fields plus explicit v2 human action snapshots; missing legacy actor/comment is never invented.',
  authorityBoundary: 'Recommendation and revalidation remain advisory; explicit acknowledgement/archive actions are human actions on the advisory case lifecycle only.',
  legacyBoundary: 'Legacy lifecycle transitions remain visible but are labelled when v2 actor/comment/snapshot evidence is unavailable.',
  mutation: false,
} as const;
