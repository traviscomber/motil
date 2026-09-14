import {
  governedMemoryPrompt,
  selectGovernedMemory,
  type GovernedMemoryDomain,
  type GovernedMemoryRow,
} from '@/lib/intelligence/governed-memory';

const EXECUTIVE_MEMORY_DOMAINS = new Set<GovernedMemoryDomain>([
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

type MemoryContext = {
  supabase: any;
  organizationId: string;
  userId: string;
};

export type ExecutiveGovernedMemoryContext = {
  available: boolean;
  domains: GovernedMemoryDomain[];
  memories: ReturnType<typeof selectGovernedMemory>;
  promptContext: string;
  count: number;
  authority: 'non_canonical';
  errorCode: 'memory_unavailable' | null;
};

function allowedMemoryDomains(authorizedDomains: readonly string[]) {
  const domains = new Set<GovernedMemoryDomain>(['executive']);
  for (const candidate of authorizedDomains) {
    const normalized = String(candidate || '').trim() as GovernedMemoryDomain;
    if (EXECUTIVE_MEMORY_DOMAINS.has(normalized)) domains.add(normalized);
  }
  return Array.from(domains);
}

export async function loadExecutiveGovernedMemory(
  context: MemoryContext,
  authorizedDomains: readonly string[],
  limit = 12,
): Promise<ExecutiveGovernedMemoryContext> {
  const domains = allowedMemoryDomains(authorizedDomains);
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit || 12), 24));

  try {
    const { data, error } = await context.supabase
      .from('motil_ai_user_memory')
      .select('id,domain,memory_type,memory_text,confidence,active,created_at,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('active', true)
      .in('domain', domains)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const memories = selectGovernedMemory((data || []) as GovernedMemoryRow[], { limit: safeLimit });
    return {
      available: true,
      domains,
      memories,
      promptContext: governedMemoryPrompt(memories),
      count: memories.length,
      authority: 'non_canonical',
      errorCode: null,
    };
  } catch (error) {
    console.warn('[executive-governed-memory] load skipped', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });

    return {
      available: false,
      domains,
      memories: [],
      promptContext: governedMemoryPrompt([]),
      count: 0,
      authority: 'non_canonical',
      errorCode: 'memory_unavailable',
    };
  }
}
