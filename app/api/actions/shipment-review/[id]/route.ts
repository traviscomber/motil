export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getVisibleScopedRoleTask } from '@/lib/actions/scoped-role-task';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Despacho inválido' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (profileError) {
    console.error('[actions/shipment-review] profile lookup failed', profileError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }
  if (!profile?.cargo_id) return NextResponse.json({ error: 'Cargo no disponible' }, { status: 403 });

  const taskKey = `shipment_review:${id}`;
  const { task, error: taskError } = await getVisibleScopedRoleTask({
    supabase: context.supabase,
    organizationId: context.organizationId,
    cargoId: profile.cargo_id,
    userId: context.userId,
    taskKey,
  });

  if (taskError) {
    console.error('[actions/shipment-review] scoped task authorization failed', taskError);
    return NextResponse.json({ error: 'No se pudo autorizar la revisión del despacho' }, { status: 500 });
  }
  if (!task) return NextResponse.json({ error: 'Esta revisión no está disponible para tu cargo' }, { status: 404 });

  const { data: shipment, error: shipmentError } = await context.supabase
    .from('production_concentrate_shipments')
    .select('id,organization_id,shipment_date,shipment_number,destination,carrier_name_raw,vehicle_plate_raw,raw_quantity,raw_unit,normalized_metric_tons,normalization_status,normalization_rule,source_file,source_sheet,source_row,source_payload,validation_status,validation_notes,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();

  if (shipmentError) {
    console.error('[actions/shipment-review] shipment lookup failed', shipmentError);
    return NextResponse.json({ error: 'No se pudo cargar el despacho' }, { status: 500 });
  }
  if (!shipment) return NextResponse.json({ error: 'Despacho no encontrado' }, { status: 404 });

  return NextResponse.json({
    task,
    shipment,
    source: 'production_concentrate_shipments',
    authorizationBoundary: 'scoped_role_task_sources_v1',
  });
}
