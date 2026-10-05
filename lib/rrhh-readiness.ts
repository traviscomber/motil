export type FaenaReadinessStatus = 'ready' | 'conditional' | 'blocked';

export type AssignmentSnapshot = {
  id?: string;
  site_name?: string | null;
  shift_pattern?: string | null;
  employment_type?: string | null;
  role_title?: string | null;
  area?: string | null;
  start_date?: string | null;
  end_date?: string | null;
} | null;

export type ReadinessEvidence = {
  credential_count: number;
  valid_credential_count: number;
  expired_credentials: number;
  credentials_expiring_30d: number;
  competency_count: number;
  valid_competency_count: number;
  expired_competencies: number;
  active_epp_count: number;
  epp_renewal_30d: number;
};

type EvidenceRow = { status?: string | null; expires_at?: string | null };
type EppRow = { status?: string | null; renewal_due_at?: string | null; ended_at?: string | null };
type AssignmentRow = NonNullable<AssignmentSnapshot>;

const VALID_STATES = new Set(['valid', 'active', 'vigente', 'approved', 'cumple', 'assigned']);
const EXPIRED_STATES = new Set(['expired', 'vencida', 'vencido', 'revoked', 'suspended', 'cancelled', 'inactivo']);

function normalized(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function inNextDays(value: string | null | undefined, today: string, days: number) {
  if (!value || value < today) return false;
  const end = new Date(today + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + days);
  return value <= end.toISOString().slice(0, 10);
}

function isExpired(value: string | null | undefined, status: string | null | undefined, today: string) {
  return EXPIRED_STATES.has(normalized(status)) || Boolean(value && value < today);
}

function isExplicitlyValid(value: string | null | undefined, status: string | null | undefined, today: string) {
  return VALID_STATES.has(normalized(status)) && !isExpired(value, status, today);
}

export function getSantiagoDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function selectCurrentAssignment(assignments: AssignmentRow[], today: string): AssignmentSnapshot {
  return [...assignments]
    .filter((item) => (!item.start_date || item.start_date <= today) && (!item.end_date || item.end_date >= today))
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))[0] || null;
}

export function summarizeReadinessEvidence(input: {
  credentials?: EvidenceRow[];
  competencies?: EvidenceRow[];
  epp?: EppRow[];
  today: string;
}): ReadinessEvidence {
  const credentials = input.credentials || [];
  const competencies = input.competencies || [];
  const epp = input.epp || [];

  return {
    credential_count: credentials.length,
    valid_credential_count: credentials.filter((row) => isExplicitlyValid(row.expires_at, row.status, input.today)).length,
    expired_credentials: credentials.filter((row) => isExpired(row.expires_at, row.status, input.today)).length,
    credentials_expiring_30d: credentials.filter((row) => !isExpired(row.expires_at, row.status, input.today) && inNextDays(row.expires_at, input.today, 30)).length,
    competency_count: competencies.length,
    valid_competency_count: competencies.filter((row) => isExplicitlyValid(row.expires_at, row.status, input.today)).length,
    expired_competencies: competencies.filter((row) => isExpired(row.expires_at, row.status, input.today)).length,
    active_epp_count: epp.filter((row) => isExplicitlyValid(row.renewal_due_at, row.status, input.today) && !row.ended_at).length,
    epp_renewal_30d: epp.filter((row) => !row.ended_at && !isExpired(row.renewal_due_at, row.status, input.today) && inNextDays(row.renewal_due_at, input.today, 30)).length,
  };
}

export function evaluateFaenaReadiness(input: {
  employmentStatus?: string | null;
  assignment: AssignmentSnapshot;
  evidence: ReadinessEvidence;
  policyConfigured?: boolean;
  requirementsSatisfied?: boolean | null;
  requirementGaps?: string[];
}) {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (normalized(input.employmentStatus) !== 'active') {
    return {
      status: 'blocked' as FaenaReadinessStatus,
      label: 'BLOQUEADO' as const,
      reasons: ['La relación laboral no figura activa.'],
      warnings,
      policy_configured: Boolean(input.policyConfigured),
      evidence_complete: false,
    };
  }

  if (!input.assignment) reasons.push('Sin asignación laboral vigente a una faena.');
  else {
    if (!input.assignment.site_name) reasons.push('La asignación vigente no identifica faena.');
    if (!input.assignment.shift_pattern) reasons.push('La asignación vigente no identifica turno.');
  }

  if (input.evidence.credential_count === 0) reasons.push('Sin credenciales estructuradas en la ficha.');
  if (input.evidence.competency_count === 0) reasons.push('Sin competencias estructuradas en la ficha.');
  if (input.evidence.active_epp_count === 0) reasons.push('Sin EPP vigente estructurado en la ficha.');
  if (input.evidence.expired_credentials > 0) warnings.push(input.evidence.expired_credentials + ' credencial(es) vencida(s) requieren revisión.');
  if (input.evidence.expired_competencies > 0) warnings.push(input.evidence.expired_competencies + ' competencia(s) vencida(s) requieren revisión.');
  if (input.evidence.credentials_expiring_30d > 0) warnings.push(input.evidence.credentials_expiring_30d + ' credencial(es) vencen dentro de 30 días.');
  if (input.evidence.epp_renewal_30d > 0) warnings.push(input.evidence.epp_renewal_30d + ' asignación(es) de EPP requieren renovación dentro de 30 días.');

  if (!input.policyConfigured) {
    reasons.unshift('Los requisitos explícitos de habilitación de la faena aún no están configurados.');
    return {
      status: 'conditional' as FaenaReadinessStatus,
      label: 'CONDICIONAL' as const,
      reasons,
      warnings,
      policy_configured: false,
      evidence_complete: false,
    };
  }

  if (input.requirementsSatisfied === false) {
    return {
      status: 'blocked' as FaenaReadinessStatus,
      label: 'BLOQUEADO' as const,
      reasons: [...(input.requirementGaps || []), ...reasons],
      warnings,
      policy_configured: true,
      evidence_complete: false,
    };
  }

  const assignmentReady = Boolean(input.assignment?.site_name && input.assignment?.shift_pattern);
  if (input.requirementsSatisfied === true && assignmentReady && reasons.length === 0 && warnings.length === 0) {
    return {
      status: 'ready' as FaenaReadinessStatus,
      label: 'APTO' as const,
      reasons: [],
      warnings: [],
      policy_configured: true,
      evidence_complete: true,
    };
  }

  return {
    status: 'conditional' as FaenaReadinessStatus,
    label: 'CONDICIONAL' as const,
    reasons,
    warnings,
    policy_configured: true,
    evidence_complete: false,
  };
}
