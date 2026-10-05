export type FaenaReadinessStatus = 'ready' | 'conditional' | 'blocked';
export type ReadinessRequirementType = 'credential' | 'competency' | 'epp';

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

export type ReadinessRequirement = {
  id?: string;
  policy_id?: string;
  requirement_type: ReadinessRequirementType;
  requirement_name: string;
  requirement_code?: string | null;
  notes?: string | null;
};

export type ReadinessPolicy = {
  id: string;
  name: string;
  site_name: string;
  role_title?: string | null;
  status: string;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  requirements?: ReadinessRequirement[];
};

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

type EvidenceRow = {
  status?: string | null;
  expires_at?: string | null;
  credential_name?: string | null;
  credential_number?: string | null;
  competency_name?: string | null;
};
type EppRow = {
  status?: string | null;
  renewal_due_at?: string | null;
  ended_at?: string | null;
  epp_name?: string | null;
};
type AssignmentRow = NonNullable<AssignmentSnapshot>;

const VALID_STATES = new Set(['valid', 'active', 'vigente', 'approved', 'cumple', 'assigned']);
const EXPIRED_STATES = new Set(['expired', 'vencida', 'vencido', 'revoked', 'suspended', 'cancelled', 'inactivo']);

function normalized(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

export function selectReadinessPolicy(
  policies: ReadinessPolicy[],
  assignment: AssignmentSnapshot,
  today: string,
): ReadinessPolicy | null {
  if (!assignment?.site_name) return null;
  const site = normalized(assignment.site_name);
  const role = normalized(assignment.role_title);

  const candidates = policies.filter((policy) =>
    normalized(policy.status) === 'active' &&
    normalized(policy.site_name) === site &&
    (!policy.effective_from || policy.effective_from <= today) &&
    (!policy.effective_to || policy.effective_to >= today)
  );

  return candidates.find((policy) => normalized(policy.role_title) && normalized(policy.role_title) === role)
    || candidates.find((policy) => !normalized(policy.role_title))
    || null;
}

export function assessReadinessPolicy(input: {
  policy: ReadinessPolicy | null;
  credentials?: EvidenceRow[];
  competencies?: EvidenceRow[];
  epp?: EppRow[];
  today: string;
}) {
  const requirements = input.policy?.requirements || [];
  if (!input.policy || requirements.length === 0) {
    return {
      configured: false,
      satisfied: null as boolean | null,
      gaps: input.policy ? ['La política encontrada todavía no tiene requisitos configurados.'] : [],
      requirement_count: requirements.length,
    };
  }

  const credentials = input.credentials || [];
  const competencies = input.competencies || [];
  const epp = input.epp || [];
  const gaps: string[] = [];

  for (const requirement of requirements) {
    const expectedName = normalized(requirement.requirement_name);
    const expectedCode = normalized(requirement.requirement_code);

    if (requirement.requirement_type === 'credential') {
      const match = credentials.some((row) =>
        normalized(row.credential_name) === expectedName &&
        (!expectedCode || normalized(row.credential_number) === expectedCode) &&
        isExplicitlyValid(row.expires_at, row.status, input.today)
      );
      if (!match) gaps.push('Falta credencial vigente: ' + requirement.requirement_name + '.');
    } else if (requirement.requirement_type === 'competency') {
      const match = competencies.some((row) =>
        normalized(row.competency_name) === expectedName &&
        isExplicitlyValid(row.expires_at, row.status, input.today)
      );
      if (!match) gaps.push('Falta competencia vigente: ' + requirement.requirement_name + '.');
    } else if (requirement.requirement_type === 'epp') {
      const match = epp.some((row) =>
        normalized(row.epp_name) === expectedName &&
        !row.ended_at &&
        isExplicitlyValid(row.renewal_due_at, row.status, input.today)
      );
      if (!match) gaps.push('Falta EPP vigente: ' + requirement.requirement_name + '.');
    }
  }

  return {
    configured: true,
    satisfied: gaps.length === 0,
    gaps,
    requirement_count: requirements.length,
  };
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

  if (input.evidence.expired_credentials > 0) warnings.push(input.evidence.expired_credentials + ' credencial(es) vencida(s) requieren revisión.');
  if (input.evidence.expired_competencies > 0) warnings.push(input.evidence.expired_competencies + ' competencia(s) vencida(s) requieren revisión.');
  if (input.evidence.credentials_expiring_30d > 0) warnings.push(input.evidence.credentials_expiring_30d + ' credencial(es) vencen dentro de 30 días.');
  if (input.evidence.epp_renewal_30d > 0) warnings.push(input.evidence.epp_renewal_30d + ' asignación(es) de EPP requieren renovación dentro de 30 días.');

  if (!input.policyConfigured) {
    if (input.evidence.credential_count === 0) reasons.push('Sin credenciales estructuradas en la ficha.');
    if (input.evidence.competency_count === 0) reasons.push('Sin competencias estructuradas en la ficha.');
    if (input.evidence.active_epp_count === 0) reasons.push('Sin EPP vigente estructurado en la ficha.');
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
  if (input.requirementsSatisfied === true && assignmentReady && reasons.length === 0) {
    return {
      status: 'ready' as FaenaReadinessStatus,
      label: 'APTO' as const,
      reasons: [],
      warnings,
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
