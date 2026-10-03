export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const orderId = request.nextUrl.searchParams.get('orderId')?.trim();
    let query = context.supabase
      .from('procurement_invoiceable_order_lines_v1')
      .select('organization_id, order_id, order_line_id, canonical_product_id, product_code, description, unit, unit_cost, quantity_ordered, quantity_accepted, quantity_invoiced, quantity_invoiceable')
      .eq('organization_id', context.organizationId)
      .gt('quantity_invoiceable', 0)
      .order('order_id');

    if (orderId) query = query.eq('order_id', orderId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo calcular el saldo facturable';
    console.error('[procurement/invoiceable-lines:get]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
