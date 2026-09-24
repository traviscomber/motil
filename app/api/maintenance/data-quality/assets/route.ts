export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const MAX_ROWS = 200;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, false);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const status = request.nextUrl.searchParams.get('status')?.trim() || 'deterministic_candidate';

  const query = context.supabase
    .from('maintenance_asset_reconciliation_v1')
    .select(
      'canonical_asset_id,asset_code,name,current_location,current_criticality,current_cost_center_code,proposed_location,proposed_criticality,proposed_cost_center_code,location_candidate_count,criticality_candidate_count,cost_center_match_count,reconciliation_status'
    )
    .eq('organization_id', context.organizationId)
    .order('name', { ascending: true })
    .limit(MAX_ROWS);

  if (status !== 'all') query.eq('reconciliation_status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const summary = {
    rows: rows.length,
    proposedLocations: rows.filter((row: any) => row.proposed_location).length,
    proposedCriticalities: rows.filter((row: any) => row.proposed_criticality).length,
    proposedCostCenters: rows.filter((row: any) => row.proposed_cost_center_code).length,
    truncated: rows.length === MAX_ROWS,
  };

  return NextResponse.json({
    summary,
    rows,
    mutationExecuted: false,
    semantics: {
      deterministicCandidate:
        'Propuesta derivada de evidencia única o de un único centro canónico no redistribuible. No modifica el maestro.',
      reviewRequired: 'Existe evidencia contradictoria o más de un candidato; requiere revisión humana.',
    },
  });
}
