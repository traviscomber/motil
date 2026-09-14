export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import {
  GOVERNED_MEMORY_POLICY,
  governedMemoryPrompt,
  selectGovernedMemory,
  type GovernedMemoryDomain,
  type GovernedMemoryRow,
} from '@/lib/intelligence/governed-memory';

const DOMAINS = new Set<GovernedMemoryDomain>([
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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const rawDomain = request.nextUrl.searchParams.get('domain')?.trim() || null;
  if (rawDomain && !DOMAINS.has(rawDomain as GovernedMemoryDomain)) {
    return NextResponse.json({ error: 'Dominio de memoria no válido.' }, { status: 400 });
  }

  const parsedLimit = Number(request.nextUrl.searchParams.get('limit') || 12);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(Math.trunc(parsedLimit), 24)) : 12;

  try {
    let query = context.supabase
      .from('motil_ai_user_memory')
      .select('id,domain,memory_type,memory_text,confidence,active,created_at,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (rawDomain) query = query.eq('domain', rawDomain);

    const { data, error } = await query;
    if (error) throw error;

    const memories = selectGovernedMemory((data || []) as GovernedMemoryRow[], {
      domain: rawDomain as GovernedMemoryDomain | null,
      limit,
    });

    return NextResponse.json({
      memories,
      count: memories.length,
      promptContext: governedMemoryPrompt(memories),
      policy: GOVERNED_MEMORY_POLICY,
      operationalMutationExecuted: false,
      persistence: 'governed_memory_context_v1',
    });
  } catch (error) {
    console.error('[motil-governed-memory-context] load failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible cargar el contexto laboral gobernado.' }, { status: 500 });
  }
}
