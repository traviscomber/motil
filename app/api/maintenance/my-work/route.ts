export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveMaintenanceViewerMode } from '@/lib/maintenance/viewer-mode';

const terminalStatuses = new Set(['completed', 'closed', 'cancelled']);
const activeTimerStatuses = new Set(['running', 'paused']);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .select('cargo_id')
      .eq('id', access.user.id)
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

    if (resolveMaintenanceViewerMode(cargoName) !== 'execution') {
      return NextResponse.json({ error: 'Esta vista está reservada para perfiles de ejecución.' }, { status: 403 });
    }

    const { data: person, error: personError } = await context.supabase
      .from('people')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('profile_id', access.user.id)
      .maybeSingle();
    if (personError) throw personError;

    if (!person?.id) {
      return NextResponse.json({
        identityLinked: false,
        actions: [],
        canEdit: access.canWrite,
        sources: ['profiles', 'cargos', 'people'],
      });
    }

    const { data: rows, error: workOrdersError } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,work_order_number,title,status,priority,scheduled_date,start_date,created_at,timer_status,total_timer_minutes,total_timer_seconds,canonical_asset_id')
      .eq('organization_id', context.organizationId)
      .eq('assigned_person_id', person.id);
    if (workOrdersError) throw workOrdersError;

    const actions = (rows || [])
      .filter((row: any) => !terminalStatuses.has(String(row.status || '').toLowerCase()))
      .sort((a: any, b: any) => {
        const aActive = activeTimerStatuses.has(String(a.timer_status || '').toLowerCase()) || String(a.status || '').toLowerCase() === 'in_progress';
        const bActive = activeTimerStatuses.has(String(b.timer_status || '').toLowerCase()) || String(b.status || '').toLowerCase() === 'in_progress';
        if (aActive !== bActive) return aActive ? -1 : 1;
        const aDate = a.scheduled_date ? Date.parse(String(a.scheduled_date)) : Number.POSITIVE_INFINITY;
        const bDate = b.scheduled_date ? Date.parse(String(b.scheduled_date)) : Number.POSITIVE_INFINITY;
        if (aDate !== bDate) return aDate - bDate;
        return Date.parse(String(a.created_at || '')) - Date.parse(String(b.created_at || ''));
      })
      .map((row: any) => {
        const workOrderNumber = row.work_order_number || 'OT';
        const workOrderStatus = String(row.status || '').toLowerCase();
        const timerStatus = String(row.timer_status || '').toLowerCase();
        const isActive = activeTimerStatuses.has(timerStatus) || workOrderStatus === 'in_progress';
        const stateLabel = timerStatus === 'running'
          ? 'En curso'
          : timerStatus === 'paused'
            ? 'Pausada'
            : workOrderStatus === 'in_progress'
              ? 'Por reanudar'
              : 'Pendiente';
        const scheduledEvidence = row.scheduled_date ? `Programada ${row.scheduled_date}` : 'Sin fecha programada';
        const priorityEvidence = row.priority ? ` · Prioridad ${row.priority}` : '';

        return {
          id: String(row.id),
          workOrderNumber,
          title: row.title || 'Orden de trabajo asignada',
          evidence: `${scheduledEvidence}${priorityEvidence}`,
          href: `/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(String(row.id))}`,
          actionLabel: isActive ? 'Reanudar' : 'Iniciar',
          stateLabel,
          status: workOrderStatus,
          timerStatus,
          priority: row.priority || null,
          scheduledDate: row.scheduled_date || null,
          totalTimerSeconds: Number(row.total_timer_seconds || 0),
        };
      });

    return NextResponse.json({
      identityLinked: true,
      actions,
      canEdit: access.canWrite,
      sources: ['profiles', 'cargos', 'people', 'maintenance_work_orders'],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar tu trabajo asignado' }, { status: 500 });
  }
}
