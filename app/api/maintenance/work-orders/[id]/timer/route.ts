import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';
import { resolveMaintenanceViewerMode } from '@/lib/maintenance/viewer-mode';

const TIMER_ACTIONS = new Set(['play', 'pause', 'resume', 'terminate']);

async function requireTimerRoleScope(
  context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true },
  workOrderId: string,
) {
  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();
  if (profileError) throw profileError;

  let cargoName: string | null = null;
  if (profile?.cargo_id) {
    const { data: cargo, error: cargoError } = await context.supabase
      .from('cargos')
      .select('name')
      .eq('id', profile.cargo_id)
      .maybeSingle();
    if (cargoError) throw cargoError;
    cargoName = cargo?.name || null;
  }

  const mode = resolveMaintenanceViewerMode(cargoName);
  if (mode === 'workshop') {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'El temporizador móvil no está asignado a este cargo.' }, { status: 403 }) };
  }
  if (mode !== 'execution') return { ok: true as const };

  const { data: person, error: personError } = await context.supabase
    .from('people')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('profile_id', context.userId)
    .eq('employment_status', 'active')
    .maybeSingle();
  if (personError) throw personError;

  const { data: order, error: orderError } = await context.supabase
    .from('maintenance_work_orders')
    .select('assigned_person_id')
    .eq('organization_id', context.organizationId)
    .eq('id', workOrderId)
    .maybeSingle();
  if (orderError) throw orderError;

  if (!person?.id || !order || String(order.assigned_person_id || '') !== person.id) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'Esta orden no está asignada a tu identidad operativa.' }, { status: 403 }) };
  }
  return { ok: true as const };
}

function timerErrorResponse(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === 'P0002') return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });
  if (error?.code === '22023') return NextResponse.json({ ok: false, error: error.message || 'Invalid action' }, { status: 400 });
  if (error?.code === '55000') return NextResponse.json({ ok: false, error: error.message || 'Invalid timer transition' }, { status: 409 });
  return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id: workOrderId } = await params;
  const roleScope = await requireTimerRoleScope(context, workOrderId);
  if (!roleScope.ok) return roleScope.response;
  const guard = await requireOperationalMaintenanceWorkOrder(context.supabase, context.organizationId, workOrderId);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error, record_scope: guard.scope }, { status: guard.status });

  const body = (await request.json().catch(() => null)) as { action?: string; notes?: string | null } | null;
  const action = String(body?.action || '');
  if (!TIMER_ACTIONS.has(action)) return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });

  const { data, error } = await context.supabase.rpc('update_work_order_timer', {
    p_organization_id: context.organizationId,
    p_work_order_id: workOrderId,
    p_action: action,
    p_actor_id: context.userId,
    p_actor_name: context.userName || context.userEmail || null,
    p_notes: body?.notes?.trim() || null,
  });

  if (error) return timerErrorResponse(error);
  return NextResponse.json(data);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id: workOrderId } = await params;
  const roleScope = await requireTimerRoleScope(context, workOrderId);
  if (!roleScope.ok) return roleScope.response;
  const { data: workOrder, error } = await context.supabase
    .from('maintenance_work_orders')
    .select('id, timer_status, timer_start_time, total_timer_minutes, created_by')
    .eq('id', workOrderId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message || 'No se pudo cargar el temporizador' }, { status: 500 });
  if (!workOrder) return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });

  const { data: timeline, error: timelineError } = await context.supabase
    .from('work_order_events')
    .select('id,event_type,event_at,actor_name,summary,payload')
    .eq('organization_id', context.organizationId)
    .eq('work_order_id', workOrderId)
    .like('event_type', 'timer_%')
    .order('event_at', { ascending: false })
    .limit(10);

  if (timelineError) return NextResponse.json({ ok: false, error: timelineError.message || 'No se pudo cargar el historial del temporizador' }, { status: 500 });

  const totalMinutes = Number(workOrder.total_timer_minutes || 0);
  return NextResponse.json({
    ok: true,
    canEdit: access.canWrite && Boolean(workOrder.created_by),
    record_scope: workOrder.created_by ? 'operational' : 'historical',
    current: {
      timer_status: workOrder.timer_status || 'idle',
      timer_start_time: workOrder.timer_start_time || null,
      total_minutes: totalMinutes,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
    timeline: timeline || [],
  });
}
