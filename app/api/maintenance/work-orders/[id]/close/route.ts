export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';
import { requireAssignedMaintenanceExecution } from '@/lib/maintenance/work-order-execution-access';

type CloseWorkOrderPayload = { actual_duration_hours?: number | string | null; root_cause?: string | null; preventive_actions?: string | null };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const guard = await requireOperationalMaintenanceWorkOrder(context.supabase, context.organizationId, id);
    if (!guard.ok) return NextResponse.json({ error: guard.error, record_scope: guard.scope }, { status: guard.status });

    const accessLevel = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
    const executionAccess = await requireAssignedMaintenanceExecution(context, id);
    if (accessLevel !== 'ED' && !executionAccess.ok) return executionAccess.response;

    const { count: evidenceCount, error: evidenceError } = await context.supabase
      .from('work_order_evidence_files')
      .select('id', { head: true, count: 'exact' })
      .eq('organization_id', context.organizationId)
      .eq('work_order_id', id)
      .eq('evidence_type', 'photo');
    if (evidenceError) throw evidenceError;
    if ((evidenceCount || 0) < 1) return NextResponse.json({ error: 'Agrega al menos una foto como evidencia antes de cerrar la OT.' }, { status: 409 });

    const body = (await request.json()) as CloseWorkOrderPayload;
    const submittedHours = body.actual_duration_hours == null || body.actual_duration_hours === ''
      ? null : Number(body.actual_duration_hours);
    if (submittedHours !== null && (!Number.isFinite(submittedHours) || submittedHours <= 0)) {
      return NextResponse.json({ error: 'Ingresa horas reales válidas.' }, { status: 400 });
    }

    // The database commits all closure changes together, or none of them.
    const { error: closeError } = await context.supabase.rpc('close_work_order_atomically', {
      p_organization_id: context.organizationId,
      p_work_order_id: id,
      p_actor_id: context.userId,
      p_actual_duration_hours: submittedHours,
      p_root_cause: body.root_cause ?? null,
      p_preventive_actions: body.preventive_actions ?? null,
    });
    if (closeError) {
      const status = ['55000', 'P0001', 'P0002', '22023', '42501'].includes(closeError.code || '') ? 409 : 500;
      return NextResponse.json({ error: closeError.message || 'No se pudo cerrar la orden de trabajo' }, { status });
    }

    const { data: updatedOT, error: reloadError } = await context.supabase.from('maintenance_work_orders').select('*').eq('id', id).eq('organization_id', context.organizationId).single();
    if (reloadError) throw reloadError;

    return NextResponse.json({ data: updatedOT, mttr: updatedOT?.actual_duration_hours ?? null, downtime_hours: updatedOT?.down_time_hours ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cerrar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
