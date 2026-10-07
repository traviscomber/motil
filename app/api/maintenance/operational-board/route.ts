export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveMaintenanceViewerMode } from '@/lib/maintenance/viewer-mode';

const TERMINAL = ['completed', 'closed', 'cancelled', 'canceled'];

type AssetRow = {
  id: string;
  asset_code: string | null;
  name: string | null;
};

function stateFor(row: any, pendingApproval = false) {
  if (pendingApproval) return 'pending_approval';
  const timer = String(row.timer_status || '').toLowerCase();
  const status = String(row.status || '').toLowerCase();
  if (timer === 'paused') return 'paused';
  if (timer === 'running') return 'running';
  if (status === 'in_progress') return 'resume';
  return 'pending';
}

function stateRank(state: string) {
  if (state === 'paused') return 0;
  if (state === 'running') return 1;
  if (state === 'pending_approval') return 2;
  if (state === 'resume') return 3;
  return 4;
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
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
    if (mode !== 'planning' && mode !== 'leadership') {
      return NextResponse.json({ error: 'Esta vista corresponde a planificación y supervisión de mantenimiento.' }, { status: 403 });
    }

    const [activeResult, completedResult, reviewsResult] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select('id,work_order_number,title,status,priority,scheduled_date,assigned_to_name,canonical_asset_id,timer_status,timer_start_time,total_timer_seconds,updated_at')
        .eq('organization_id', context.organizationId)
        .not('created_by', 'is', null)
        .not('status', 'in', '("completed","closed","cancelled","canceled")')
        .order('updated_at', { ascending: false })
        .limit(100),
      context.supabase
        .from('maintenance_work_orders')
        .select('id,work_order_number,title,status,priority,scheduled_date,assigned_to_name,canonical_asset_id,timer_status,timer_start_time,total_timer_seconds,closed_at,updated_at')
        .eq('organization_id', context.organizationId)
        .not('created_by', 'is', null)
        .eq('status', 'completed')
        .order('closed_at', { ascending: false, nullsFirst: false })
        .limit(50),
      context.supabase
        .from('work_order_supervisor_reviews')
        .select('work_order_id,status,reviewed_by_name,reviewed_at')
        .eq('organization_id', context.organizationId),
    ]);

    const sourceError = activeResult.error || completedResult.error || reviewsResult.error;
    if (sourceError) throw sourceError;

    const approvedIds = new Set(
      (reviewsResult.data || [])
        .filter((row: any) => String(row.status || '').toLowerCase() === 'approved')
        .map((row: any) => String(row.work_order_id)),
    );

    const pendingApproval = (completedResult.data || []).filter(
      (row: any) => !approvedIds.has(String(row.id)),
    );

    const rows = [...(activeResult.data || []), ...pendingApproval];
    const ids = rows.map((row: any) => String(row.id));
    const assetIds = [...new Set(rows.map((row: any) => row.canonical_asset_id).filter(Boolean).map(String))];

    const [pauseResult, assetResult] = await Promise.all([
      ids.length > 0
        ? context.supabase
            .from('work_order_events')
            .select('work_order_id,event_at,payload')
            .eq('organization_id', context.organizationId)
            .eq('event_type', 'timer_pause')
            .in('work_order_id', ids)
            .order('event_at', { ascending: false })
            .limit(300)
        : Promise.resolve({ data: [], error: null }),
      assetIds.length > 0
        ? context.supabase
            .from('maintenance_canonical_assets_v1')
            .select('id,asset_code,name')
            .eq('organization_id', context.organizationId)
            .in('id', assetIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (pauseResult.error || assetResult.error) throw pauseResult.error || assetResult.error;

    const lastPause = new Map<string, { comment: string | null; at: string | null }>();
    for (const event of pauseResult.data || []) {
      const id = String((event as any).work_order_id);
      if (lastPause.has(id)) continue;
      const payload = ((event as any).payload || {}) as Record<string, unknown>;
      lastPause.set(id, {
        comment: typeof payload.notes === 'string' && payload.notes.trim() ? payload.notes.trim() : null,
        at: (event as any).event_at || null,
      });
    }

    const assetMap = new Map<string, AssetRow>();
    for (const asset of (assetResult.data || []) as AssetRow[]) assetMap.set(String(asset.id), asset);

    const board = rows.map((row: any) => {
      const isPendingApproval = String(row.status || '').toLowerCase() === 'completed' && !approvedIds.has(String(row.id));
      const state = stateFor(row, isPendingApproval);
      const pause = lastPause.get(String(row.id)) || null;
      const asset = row.canonical_asset_id ? assetMap.get(String(row.canonical_asset_id)) || null : null;
      return {
        id: String(row.id),
        workOrderNumber: row.work_order_number || null,
        title: row.title || null,
        state,
        status: row.status || null,
        priority: row.priority || null,
        scheduledDate: row.scheduled_date || null,
        assignedToName: row.assigned_to_name || null,
        timerStatus: row.timer_status || 'idle',
        timerStartTime: row.timer_start_time || null,
        totalTimerSeconds: Number(row.total_timer_seconds || 0),
        lastPauseComment: pause?.comment || null,
        lastPauseAt: pause?.at || null,
        asset: asset ? { id: asset.id, code: asset.asset_code, name: asset.name } : null,
        href: `/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(String(row.id))}`,
      };
    }).sort((a, b) => {
      const stateDiff = stateRank(a.state) - stateRank(b.state);
      if (stateDiff !== 0) return stateDiff;
      const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = (priorityRank[String(a.priority || '')] ?? 9) - (priorityRank[String(b.priority || '')] ?? 9);
      if (priorityDiff !== 0) return priorityDiff;
      return String(a.workOrderNumber || '').localeCompare(String(b.workOrderNumber || ''), 'es');
    });

    const summary = {
      running: board.filter((row) => row.state === 'running').length,
      paused: board.filter((row) => row.state === 'paused').length,
      pending: board.filter((row) => row.state === 'pending' || row.state === 'resume').length,
      pendingApproval: board.filter((row) => row.state === 'pending_approval').length,
    };

    return NextResponse.json({
      board,
      summary,
      mode,
      sources: ['maintenance_work_orders', 'work_order_events', 'work_order_supervisor_reviews', 'maintenance_canonical_assets_v1'],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo cargar la mesa operacional de OT' },
      { status: 500 },
    );
  }
}
