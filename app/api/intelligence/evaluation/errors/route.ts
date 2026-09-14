export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import { CORE_ERROR_OBSERVABILITY_POLICY } from '@/lib/intelligence/core-error-observability';

export async function GET(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedHours = Number(request.nextUrl.searchParams.get('hours') || 24);
  const hours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.round(requestedHours), 1), 168) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const result = await context.supabase
    .from('motil_ai_core_errors')
    .select('id,domain,route_intent,route_mode,route_capabilities,failure_phase,error_code,http_status,created_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (result.error) {
    return NextResponse.json({ error: 'No fue posible cargar errores del Intelligence Core.' }, { status: 500 });
  }

  const rows = result.data || [];
  const byCode = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.error_code || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byPhase = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.failure_phase || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    windowHours: hours,
    errorCount: rows.length,
    byCode,
    byPhase,
    rows,
    policy: CORE_ERROR_OBSERVABILITY_POLICY,
    operationalMutationExecuted: false,
    authority: 'diagnostic_observability_only',
  });
}
