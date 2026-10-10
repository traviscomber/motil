export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { requireAssignedMaintenanceExecution } from '@/lib/maintenance/work-order-execution-access';
import { requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';

// Read-only preparation. Download only the current operator's assigned active OT.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const assigned = await requireAssignedMaintenanceExecution(context, id);
    if (!assigned.ok) return assigned.response;
    const guard = await requireOperationalMaintenanceWorkOrder(context.supabase, context.organizationId, id);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { data: order, error } = await context.supabase.from('maintenance_work_orders')
      .select('id,title,description,status,work_order_number,canonical_asset_id')
      .eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ error: 'OT no disponible.' }, { status: 404 });
    if (['completed', 'closed', 'cancelled', 'canceled'].includes(order.status || '')) {
      return NextResponse.json({ error: 'Prepara solamente OT activas asignadas a ti.' }, { status: 409 });
    }
    let assetName = '';
    if (order.canonical_asset_id) {
      const { data: asset, error: assetError } = await context.supabase.from('maintenance_canonical_assets_v1')
        .select('name,asset_code').eq('organization_id', context.organizationId).eq('id', order.canonical_asset_id).maybeSingle();
      if (assetError) throw assetError;
      assetName = [asset?.name, asset?.asset_code].filter(Boolean).join(' · ');
    }
    return NextResponse.json({
      scope: `${context.organizationId}:${context.userId}`,
      workOrderId: id,
      title: String(order.title || 'Orden de trabajo').slice(0, 300),
      number: order.work_order_number,
      assetName,
      instructions: String(order.description || '').slice(0, 8000),
      status: order.status,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo preparar esta OT. Vuelve a intentar con señal.' }, { status: 500 });
  }
}
