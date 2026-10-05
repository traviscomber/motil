export type QualityGateStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export type ModuleQualityGate = {
  key: 'canonical' | 'operation' | 'integration' | 'audit' | 'freshness';
  label: string;
  weight: number;
  status: QualityGateStatus;
  detail: string;
};

export type ModuleQualityResult = {
  key: string;
  label: string;
  href: string;
  score: number;
  target: number;
  certified: boolean;
  gates: ModuleQualityGate[];
  blockers: string[];
};

export const MOTIL_QUALITY_TARGET = 9.7;

const STATUS_FACTOR: Record<QualityGateStatus, number> = {
  pass: 1,
  warn: 0.72,
  unknown: 0.55,
  fail: 0,
};

export function scoreModuleQuality(input: {
  key: string;
  label: string;
  href: string;
  gates: ModuleQualityGate[];
}): ModuleQualityResult {
  const totalWeight = input.gates.reduce((sum, gate) => sum + gate.weight, 0) || 1;
  const weighted = input.gates.reduce((sum, gate) => sum + gate.weight * STATUS_FACTOR[gate.status], 0);
  const score = Math.round((weighted / totalWeight) * 100) / 10;
  const blockers = input.gates.filter((gate) => gate.status === 'fail').map((gate) => gate.label);

  return {
    key: input.key,
    label: input.label,
    href: input.href,
    score,
    target: MOTIL_QUALITY_TARGET,
    certified: score >= MOTIL_QUALITY_TARGET && blockers.length === 0 && input.gates.every((gate) => gate.status === 'pass'),
    gates: input.gates,
    blockers,
  };
}

export function countGate(key: ModuleQualityGate['key'], label: string, weight: number, count: number | null, emptyIsFailure = true): ModuleQualityGate {
  if (count == null) return { key, label, weight, status: 'unknown', detail: 'Fuente no medible en este chequeo.' };
  if (count > 0) return { key, label, weight, status: 'pass', detail: count.toLocaleString('es-CL') + ' registro(s) disponibles.' };
  return {
    key,
    label,
    weight,
    status: emptyIsFailure ? 'fail' : 'warn',
    detail: emptyIsFailure ? 'No existe evidencia operacional en la fuente.' : 'Fuente disponible, todavía sin registros.',
  };
}

export function freshnessGate(value: string | null, now = Date.now(), maxAgeDays = 90): ModuleQualityGate {
  if (!value) return { key: 'freshness', label: 'Frescura', weight: 15, status: 'unknown', detail: 'La fuente no expone una fecha verificable.' };
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return { key: 'freshness', label: 'Frescura', weight: 15, status: 'unknown', detail: 'Timestamp no interpretable.' };
  const ageDays = Math.max(0, Math.floor((now - time) / 86_400_000));
  if (ageDays <= maxAgeDays) return { key: 'freshness', label: 'Frescura', weight: 15, status: 'pass', detail: 'Última evidencia hace ' + ageDays + ' día(s).' };
  return { key: 'freshness', label: 'Frescura', weight: 15, status: 'warn', detail: 'Última evidencia hace ' + ageDays + ' día(s).' };
}
