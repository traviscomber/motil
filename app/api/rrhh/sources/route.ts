export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: people, error } = await context.supabase
    .from('people')
    .select('id,source_type,source_reference,employment_status,updated_at')
    .eq('organization_id', context.organizationId)
    .order('source_type')
    .order('source_reference');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, {
    sourceType: string;
    sourceReference: string;
    people: number;
    active: number;
    lastUpdatedAt: string | null;
  }>();

  for (const row of people || []) {
    const sourceType = String(row.source_type || 'unknown').trim() || 'unknown';
    const sourceReference = String(row.source_reference || 'Sin referencia').trim() || 'Sin referencia';
    const key = `${sourceType}:${sourceReference}`;
    const current = grouped.get(key) || {
      sourceType,
      sourceReference,
      people: 0,
      active: 0,
      lastUpdatedAt: null,
    };
    current.people += 1;
    if (row.employment_status === 'active') current.active += 1;
    if (row.updated_at && (!current.lastUpdatedAt || row.updated_at > current.lastUpdatedAt)) {
      current.lastUpdatedAt = row.updated_at;
    }
    grouped.set(key, current);
  }

  const sources = Array.from(grouped.values()).sort((a, b) => b.people - a.people || a.sourceReference.localeCompare(b.sourceReference, 'es'));

  return NextResponse.json({
    data: sources,
    summary: {
      sources: sources.length,
      people: people?.length || 0,
      activePeople: (people || []).filter((row) => row.employment_status === 'active').length,
      linkedProfiles: null,
    },
    policy: {
      sourceReference: 'La referencia identifica el origen de la ficha laboral. No se presenta como archivo si la fuente fue operacional.',
    },
  });
}
