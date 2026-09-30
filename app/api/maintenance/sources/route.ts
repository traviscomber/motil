export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [importsResult, rowsResult] = await Promise.all([
    context.supabase
      .from('planning_maintenance_source_imports')
      .select('id,source_file,source_file_sha256,source_owner,source_role,source_sheet,imported_at,status,notes')
      .eq('organization_id', context.organizationId)
      .order('imported_at', { ascending: false }),
    context.supabase
      .from('planning_maintenance_source_rows')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId),
  ]);

  if (importsResult.error || rowsResult.error) {
    return NextResponse.json({
      error: importsResult.error?.message || rowsResult.error?.message || 'No se pudieron cargar las fuentes de Mantenimiento',
    }, { status: 500 });
  }

  const imports = importsResult.data || [];

  return NextResponse.json({
    data: imports,
    summary: {
      sources: imports.length,
      rows: rowsResult.count ?? 0,
      accepted: imports.filter((row) => row.status === 'accepted' || row.status === 'canonical').length,
      reviewRequired: imports.filter((row) => row.status === 'review_required').length,
    },
    policy: {
      review_required: 'La fuente se conserva como evidencia; sólo coincidencias verificables se promueven a datos canónicos.',
    },
  });
}
