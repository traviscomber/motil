export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('people')
      .select('id,full_name,role_title,profile_id')
      .eq('organization_id', context.organizationId)
      .eq('employment_status', 'active')
      .not('profile_id', 'is', null)
      .order('full_name');

    if (error) throw error;

    return NextResponse.json({ assignees: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los responsables';
    return NextResponse.json({ assignees: [], error: message }, { status: 500 });
  }
}
