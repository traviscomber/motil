export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('production_source_documents')
    .select('id,source_file,source_file_sha256,source_kind,canonical_role,row_count,formula_count,period_start,period_end,created_at')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  return NextResponse.json({
    data: rows,
    summary: {
      total: rows.length,
      canonical: rows.filter((row) => row.canonical_role === 'canonical').length,
      supporting: rows.filter((row) => row.canonical_role === 'supporting').length,
      planOnly: rows.filter((row) => row.canonical_role === 'plan_only').length,
    },
    policy: {
      canonical: 'Fuente aceptada para alimentar datos canónicos del dominio.',
      supporting: 'Fuente de contraste o respaldo; no reemplaza por sí sola la fuente canónica.',
      plan_only: 'Plan o referencia prospectiva; no se presenta como ejecución real.',
    },
  });
}
