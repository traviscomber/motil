export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type RoleTask = {
  organization_id: string;
  cargo_id: string;
  cargo_name: string;
  task_key: string;
  domain: string;
  severity: 'critical' | 'warning' | 'info';
  priority_score: number;
  title: string;
  evidence_summary: string | null;
  status: string;
  responsibility: 'owner' | 'support' | 'escalation';
  role_action: string | null;
  occurred_at: string | null;
  due_at: string | null;
  escalation_at: string | null;
  age_hours: number | null;
  urgency_state: string;
  personal_status: string | null;
  snoozed_until: string | null;
  visible_now: boolean;
  actions: unknown;
  module_route: string;
  urgency_label: string;
  responsibility_label: string;
};

const responsibilityRank: Record<RoleTask['responsibility'], number> = {
  owner: 0,
  support: 1,
  escalation: 2,
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveTaskRoute(task: RoleTask) {
  const [kind, rawId, ...rest] = task.task_key.split(':');
  if (kind === 'work_order' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return `/dashboard/mantenimiento/ordenes-trabajo/${rawId}`;
  }

  if (kind === 'maintenance_review' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    const priority = task.severity === 'critical' ? 'critical' : 'high';
    return `/dashboard/mantenimiento/ordenes-trabajo/create?reviewId=${rawId}&workType=corrective&priority=${priority}`;
  }

  if ((kind === 'incident' || kind === 'inspection' || kind === 'risk') && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return `/dashboard/sostenibilidad/prevencion-riesgos/acciones/${kind}/${rawId}`;
  }

  if (kind === 'shipment_review' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return `/dashboard/produccion/despachos/revision/${rawId}`;
  }

  if (kind === 'data_health' && rawId === 'maintenance' && rest[0] === 'missing_asset') {
    return '/dashboard/mantenimiento/ordenes-trabajo?dataHealth=missing_asset';
  }

  if (kind === 'data_health' && rawId === 'inventory' && rest[0] === 'negative_stock') {
    return '/dashboard/bodega?status=negative&dataHealth=negative_stock';
  }

  if (kind === 'data_health' && rawId === 'inventory' && rest[0] === 'freshness') {
    return '/dashboard/compras/importar-existencias?dataHealth=freshness';
  }

  if (kind === 'data_health' && rawId === 'production' && rest[0] === 'freshness') {
    return '/dashboard/produccion/actualizar-fuentes';
  }

  if (kind === 'data_health' && rawId === 'production' && rest[0] === 'transport_freshness') {
    return '/dashboard/produccion/importacion-maestra?dataHealth=transport_freshness';
  }

  if (kind === 'data_health' && rawId === 'production' && rest[0] === 'plant_freshness') {
    return '/dashboard/produccion/importacion-maestra?dataHealth=plant_freshness';
  }

  if (kind === 'data_health' && rawId === 'production' && rest[0] === 'drilling_freshness') {
    return '/dashboard/produccion/actualizar-fuentes?source=drilling';
  }

  if (kind === 'data_health' && rawId && rest.length === 1) {
    return `/dashboard/calidad-datos/salud?domain=${encodeURIComponent(rawId)}&issue=${encodeURIComponent(rest[0])}`;
  }

  if (kind === 'finance' && rawId === 'missing_cost_centers' && rest.length === 0) {
    return '/dashboard/centros-costos';
  }

  if (kind === 'finance' && (rawId === 'zero_amount_lines' || rawId === 'validation') && rest.length === 0) {
    return `/dashboard/finanzas/importar?issue=${encodeURIComponent(rawId)}`;
  }

  return task.module_route;
}

function deduplicateTasks(rows: RoleTask[]) {
  const byTaskKey = new Map<string, RoleTask>();

  for (const task of rows) {
    const current = byTaskKey.get(task.task_key);
    if (!current) {
      byTaskKey.set(task.task_key, task);
      continue;
    }

    const currentRank = responsibilityRank[current.responsibility];
    const nextRank = responsibilityRank[task.responsibility];
    const shouldReplace =
      nextRank < currentRank ||
      (nextRank === currentRank && task.priority_score > current.priority_score);

    if (shouldReplace) byTaskKey.set(task.task_key, task);
  }

  return Array.from(byTaskKey.values()).sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
}

function emptyRoleInbox(name: string | null, cargoId: string, cargoName: string | null, moduleAccess: Record<string, string> = {}) {
  return NextResponse.json({
    profile: { name, cargoId, cargoName },
    moduleAccess,
    tasks: [],
    summary: { total: 0, owners: 0, support: 0, escalations: 0, critical: 0, overdue: 0, backlog: 0 },
    generatedAt: new Date().toISOString(),
    source: 'role_task_frontend_v1',
    rawTaskCount: 0,
    deduplicatedTaskCount: 0,
  });
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id, full_name')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (profileError) {
    console.error('[role-task-inbox] profile lookup failed', profileError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }

  if (!profile?.cargo_id) {
    return NextResponse.json({
      profile: { name: profile?.full_name || null, cargoId: null, cargoName: null },
      moduleAccess: {},
      tasks: [],
      summary: { total: 0, owners: 0, support: 0, escalations: 0, critical: 0, overdue: 0, backlog: 0 },
      generatedAt: new Date().toISOString(),
    });
  }

  const [
    { data: cargo, error: cargoError },
    { data: coverage, error: coverageError },
    { data: accessRows, error: accessError },
  ] = await Promise.all([
    context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle(),
    context.supabase
      .from('operational_role_inbox_coverage_v1')
      .select('cargo_id')
      .eq('organization_id', context.organizationId)
      .eq('cargo_id', profile.cargo_id)
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from('role_matrix')
      .select('module_key,access_level')
      .eq('cargo_id', profile.cargo_id),
  ]);

  if (cargoError) {
    console.error('[role-task-inbox] cargo lookup failed', cargoError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }

  if (accessError) {
    console.warn('[role-task-inbox] module access lookup failed', accessError);
  }

  const moduleAccess = Object.fromEntries(
    (accessRows || []).map((row) => [String(row.module_key), String(row.access_level)]),
  );
  const cargoName = cargo?.name || null;
  const hasPrivateFinanceInbox = cargoName?.toUpperCase() === 'JEFE ADM.';

  if (!coverageError && !coverage && !hasPrivateFinanceInbox) {
    return emptyRoleInbox(profile.full_name || null, profile.cargo_id, cargoName, moduleAccess);
  }

  if (coverageError) {
    // This lookup is an optimization only. Preserve the existing inbox behavior if
    // the coverage surface is unavailable instead of hiding potentially valid tasks.
    console.warn('[role-task-inbox] coverage lookup failed; falling back to task view', coverageError);
  }

  const { data, error } = await context.supabase
    .from('role_task_frontend_v1')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('cargo_id', profile.cargo_id)
    .eq('visible_now', true)
    .order('priority_score', { ascending: false })
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[role-task-inbox] task lookup failed', error);
    return NextResponse.json({ error: 'No se pudo cargar tu bandeja operacional' }, { status: 500 });
  }

  const rawTasks = (data || []) as RoleTask[];
  const tasks = deduplicateTasks(rawTasks).map((task) => ({ ...task, module_route: resolveTaskRoute(task) }));
  const now = Date.now();
  const backlogCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const isOverdue = (task: RoleTask) => Boolean(task.due_at && new Date(task.due_at).getTime() < now);
  const isBacklog = (task: RoleTask) => Boolean(task.occurred_at && new Date(task.occurred_at).getTime() < backlogCutoff);

  return NextResponse.json({
    profile: { name: profile.full_name || null, cargoId: profile.cargo_id, cargoName },
    moduleAccess,
    tasks,
    summary: {
      total: tasks.length,
      owners: tasks.filter((task) => task.responsibility === 'owner').length,
      support: tasks.filter((task) => task.responsibility === 'support').length,
      escalations: tasks.filter((task) => task.responsibility === 'escalation').length,
      critical: tasks.filter((task) => task.severity === 'critical').length,
      overdue: tasks.filter(isOverdue).length,
      backlog: tasks.filter(isBacklog).length,
    },
    generatedAt: new Date().toISOString(),
    source: 'role_task_frontend_v1',
    rawTaskCount: rawTasks.length,
    deduplicatedTaskCount: tasks.length,
  });
}
