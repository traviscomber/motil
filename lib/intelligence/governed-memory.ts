export type GovernedMemoryDomain =
  | 'executive'
  | 'maintenance'
  | 'geology'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'finance'
  | 'documents'
  | 'data_health';

export type GovernedMemoryRow = {
  id: string;
  domain: string;
  memory_type: string;
  memory_text: string;
  confidence?: number | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GovernedMemoryItem = {
  id: string;
  domain: GovernedMemoryDomain;
  type: string;
  text: string;
  confidence: number | null;
  updatedAt: string | null;
};

const GOVERNED_DOMAINS = new Set<GovernedMemoryDomain>([
  'executive',
  'maintenance',
  'geology',
  'inventory',
  'procurement',
  'production',
  'finance',
  'documents',
  'data_health',
]);

// Only stable working context may enter the reasoning prompt. Operational facts,
// metrics, alerts, statuses and conclusions must always come from canonical sources.
const STABLE_TYPES = new Set([
  'role',
  'responsibility',
  'responsibilities',
  'terminology',
  'preference',
  'presentation_preference',
  'work_scope',
  'scope',
]);

const VOLATILE_OR_OPERATIONAL = /(?:metric|kpi|alert|status|stock|inventory_level|production|cost|amount|balance|work_order|purchase_order|incident|event|observation|reading|measurement|forecast|risk|priority|decision|conclusion|root_cause)/i;

function normalize(value: unknown, max = 500) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function isGovernedMemoryType(value: unknown) {
  const type = normalize(value, 80).toLowerCase();
  return Boolean(type && STABLE_TYPES.has(type) && !VOLATILE_OR_OPERATIONAL.test(type));
}

export function sanitizeGovernedMemoryRow(row: GovernedMemoryRow): GovernedMemoryItem | null {
  if (row.active === false) return null;
  const domain = normalize(row.domain, 80) as GovernedMemoryDomain;
  const type = normalize(row.memory_type, 80).toLowerCase();
  const text = normalize(row.memory_text, 500);
  if (!GOVERNED_DOMAINS.has(domain) || !isGovernedMemoryType(type) || !text) return null;

  return {
    id: normalize(row.id, 140),
    domain,
    type,
    text,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export function selectGovernedMemory(rows: GovernedMemoryRow[], options?: { domain?: GovernedMemoryDomain | null; limit?: number }) {
  const domain = options?.domain || null;
  const limit = Math.max(1, Math.min(options?.limit || 12, 24));
  return rows
    .map(sanitizeGovernedMemoryRow)
    .filter((item): item is GovernedMemoryItem => Boolean(item && (!domain || item.domain === domain)))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, limit);
}

export function governedMemoryPrompt(items: GovernedMemoryItem[]) {
  if (!items.length) return 'CONTEXTO LABORAL ESTABLE DEL USUARIO\nSin memoria gobernada aplicable.';
  const lines = items.map((item) => `- [${item.domain}/${item.type}] ${item.text}`);
  return [
    'CONTEXTO LABORAL ESTABLE DEL USUARIO — NO CANÓNICO',
    ...lines,
    'POLÍTICA: úsalo sólo para adaptar lenguaje, foco y presentación. Nunca lo uses como hecho operacional, evidencia, permiso, prioridad, causalidad ni autorización.',
  ].join('\n');
}

export const GOVERNED_MEMORY_POLICY = {
  authority: 'non_canonical',
  allowed: ['role', 'responsibility', 'terminology', 'preference', 'work_scope'],
  forbidden: ['operational_facts', 'metrics', 'alerts', 'statuses', 'priorities', 'conclusions', 'permissions'],
  rule: 'Operational truth must be resolved from current canonical evidence at decision time.',
} as const;
