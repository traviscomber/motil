export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function contextWithAccess(request: NextRequest, write: boolean) {
  const hse = await requireModuleAccess(request, MODULE_KEYS.HSE_RIESGOS, write);
  if (!hse.authorized) return { response: hse.response, context: null };
  const maintenance = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!maintenance.authorized) return { response: maintenance.response, context: null };
  const context = await getSustainabilityContext(request);
  if (!context.ok) return { response: context.response, context: null };
  return { response: null, context };
}

export async function GET(request: NextRequest) {
  const { response, context } = await contextWithAccess(request, false);
  if (!context) return response;
  const actionId = request.nextUrl.searchParams.get('correctiveActionId');
  if (!actionId || !UUID.test(actionId)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  const { data: action, error: actionError } = await context.supabase.from('sostenibilidad_corrective_actions')
    .select('id, nc_id, sostenibilidad_nonconformances!inner(organization_id)')
    .eq('id', actionId).eq('sostenibilidad_nonconformances.organization_id', context.organizationId).maybeSingle();
  if (actionError) return NextResponse.json({ error: 'Error al verificar acción HSE' }, { status: 500 });
  if (!action) return NextResponse.json({ error: 'Acción HSE no encontrada' }, { status: 404 });
  const { data, error } = await context.supabase.from('sostenibilidad_corrective_action_work_orders')
    .select('id, work_order_id, linked_at, linked_by, maintenance_work_orders!inner(work_order_number, status)')
    .eq('organization_id', context.organizationId).eq('corrective_action_id', actionId).order('linked_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: 'Vínculos no disponibles' }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const { response, context } = await contextWithAccess(request, true);
  if (!context) return response;
  const body = await request.json().catch(() => null);
  const actionId = body?.correctiveActionId;
  const orderId = body?.workOrderId;
  const orderNumber = typeof body?.workOrderNumber === 'string' ? body.workOrderNumber.trim() : '';
  if (typeof actionId !== 'string' || !UUID.test(actionId) ||
      !(typeof orderId === 'string' && UUID.test(orderId)) && !(orderNumber.length > 0 && orderNumber.length <= 80))
    return NextResponse.json({ error: 'Identificadores inválidos' }, { status: 400 });

  const [actionResult, orderResult] = await Promise.all([
    context.supabase.from('sostenibilidad_corrective_actions').select('id, sostenibilidad_nonconformances!inner(organization_id)')
      .eq('id', actionId).eq('sostenibilidad_nonconformances.organization_id', context.organizationId).maybeSingle(),
    (orderNumber ? context.supabase.from('maintenance_work_orders').select('id')
      .eq('work_order_number', orderNumber).eq('organization_id', context.organizationId).maybeSingle()
      : context.supabase.from('maintenance_work_orders').select('id')
      .eq('id', orderId).eq('organization_id', context.organizationId).maybeSingle()),
  ]);
  if (actionResult.error || orderResult.error) return NextResponse.json({ error: 'No se pudo validar el origen' }, { status: 500 });
  if (!actionResult.data || !orderResult.data) return NextResponse.json({ error: 'Acción u OT no encontrada en esta organización' }, { status: 404 });

  const { data, error } = await context.supabase.from('sostenibilidad_corrective_action_work_orders')
    .upsert({ organization_id: context.organizationId, corrective_action_id: actionId, work_order_id: orderResult.data.id, linked_by: context.userId },
      { onConflict: 'corrective_action_id,work_order_id', ignoreDuplicates: true })
    .select('id, corrective_action_id, work_order_id, linked_at').maybeSingle();
  if (error) return NextResponse.json({ error: 'No se pudo vincular la OT' }, { status: 500 });
  if (!data) {
    const existing = await context.supabase.from('sostenibilidad_corrective_action_work_orders')
      .select('id, corrective_action_id, work_order_id, linked_at')
      .eq('organization_id', context.organizationId)
      .eq('corrective_action_id', actionId)
      .eq('work_order_id', orderResult.data.id)
      .maybeSingle();
    if (existing.error || !existing.data) return NextResponse.json({ error: 'No se pudo confirmar el vínculo' }, { status: 500 });
    return NextResponse.json({ linked: true, alreadyLinked: true, data: existing.data });
  }
  return NextResponse.json({ linked: true, alreadyLinked: false, data });
}
