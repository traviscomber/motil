export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;
const MIN_REPORTS_PER_WINDOW = 30;

const numeric = (value: unknown) => Number(value || 0);
const text = (value: unknown) => String(value ?? '').trim();
const pctChange = (current: number, prior: number) => prior === 0 ? null : ((current - prior) / Math.abs(prior)) * 100;
const share = (part: number, total: number) => total > 0 ? (part / total) * 100 : null;
const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const minusMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() - months);
  return next;
};
const iso = (date: Date) => date.toISOString();
const hasOperationalSignal = (value: unknown) => {
  const normalized = text(value).toLowerCase();
  return Boolean(normalized) && !['0', 'no', 'n/a', 'na', '-'].includes(normalized);
};

async function loadPaged(queryFactory: (from: number, to: number) => PromiseLike<any>) {
  const rows: any[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await queryFactory(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  const endExclusive = startOfUtcDay(new Date());
  const recentStart = minusMonths(endExclusive, 12);
  const priorStart = minusMonths(endExclusive, 24);

  try {
    const [assetResult, costResult, reportResult] = await Promise.all([
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name')
        .eq('organization_id', context.organizationId)
        .eq('id', id)
        .maybeSingle(),
      loadPaged((from, to) => context.supabase
        .from('canonical_clp_cost_ledger')
        .select('event_at,amount,recognition_status')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .eq('recognition_status', 'recognized')
        .gte('event_at', iso(priorStart))
        .lt('event_at', iso(endExclusive))
        .order('event_at', { ascending: true })
        .range(from, to)),
      loadPaged((from, to) => context.supabase
        .from('production_drilling_source_reports')
        .select('operation_date,equipment_status_raw,equipment_without_crew_raw,power_outage_raw,water_shortage_raw')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .gte('operation_date', priorStart.toISOString().slice(0, 10))
        .lt('operation_date', endExclusive.toISOString().slice(0, 10))
        .order('operation_date', { ascending: true })
        .range(from, to)),
    ]);

    if (assetResult.error) throw assetResult.error;
    if (!assetResult.data) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    const windows = {
      prior: { cost: 0, cost_events: 0, reports: 0, degraded: 0, external_constraints: 0 },
      recent: { cost: 0, cost_events: 0, reports: 0, degraded: 0, external_constraints: 0 },
    };

    for (const row of costResult.rows) {
      const at = new Date(row.event_at).getTime();
      const bucket = at >= recentStart.getTime() ? windows.recent : windows.prior;
      bucket.cost += numeric(row.amount);
      bucket.cost_events += 1;
    }

    for (const row of reportResult.rows) {
      const at = new Date(`${row.operation_date}T00:00:00Z`).getTime();
      const bucket = at >= recentStart.getTime() ? windows.recent : windows.prior;
      const status = text(row.equipment_status_raw).toUpperCase();
      bucket.reports += 1;
      if (status === 'FUERA DE SERVICIO' || status === 'OPERATIVO CON OBSERVACIONES') bucket.degraded += 1;
      if (hasOperationalSignal(row.equipment_without_crew_raw) || hasOperationalSignal(row.power_outage_raw) || hasOperationalSignal(row.water_shortage_raw)) bucket.external_constraints += 1;
    }

    const recentShare = share(windows.recent.degraded, windows.recent.reports);
    const priorShare = share(windows.prior.degraded, windows.prior.reports);
    const comparable = windows.recent.reports >= MIN_REPORTS_PER_WINDOW && windows.prior.reports >= MIN_REPORTS_PER_WINDOW && !costResult.truncated && !reportResult.truncated;
    const costChange = comparable ? pctChange(windows.recent.cost, windows.prior.cost) : null;
    const conditionChangePp = comparable && recentShare != null && priorShare != null ? recentShare - priorShare : null;

    const direction = (value: number | null, tolerance: number) => value == null ? 'unknown' : value > tolerance ? 'up' : value < -tolerance ? 'down' : 'flat';
    const costDirection = direction(costChange, 5);
    const conditionDirection = direction(conditionChangePp, 5);
    const descriptiveAlignment = !comparable ? 'unavailable'
      : costDirection === 'up' && conditionDirection === 'up' ? 'both_up'
      : costDirection === 'down' && conditionDirection === 'down' ? 'both_down'
      : costDirection === 'flat' && conditionDirection === 'flat' ? 'both_flat'
      : 'mixed';

    return NextResponse.json({
      asset: assetResult.data,
      period: {
        prior: { from: priorStart.toISOString().slice(0, 10), to: recentStart.toISOString().slice(0, 10) },
        recent: { from: recentStart.toISOString().slice(0, 10), to: endExclusive.toISOString().slice(0, 10) },
      },
      prior: {
        ...windows.prior,
        degraded_share_percent: priorShare,
      },
      recent: {
        ...windows.recent,
        degraded_share_percent: recentShare,
      },
      comparison: {
        comparable,
        min_reports_per_window: MIN_REPORTS_PER_WINDOW,
        cost_change_percent: costChange,
        degraded_share_change_percentage_points: conditionChangePp,
        cost_direction: costDirection,
        condition_direction: conditionDirection,
        descriptive_alignment: descriptiveAlignment,
      },
      coverage: {
        cost_truncated: costResult.truncated,
        reports_truncated: reportResult.truncated,
      },
      semantics: {
        cost: 'Cambio descriptivo del gasto reconocido del ledger canónico entre dos ventanas de 12 meses.',
        condition: 'La proporción de reportes con estado fuera de servicio u operativo con observaciones es frecuencia observada, no probabilidad de falla.',
        external_constraints: 'Agua, energía o falta de dotación permanecen separadas de la condición mecánica y no se interpretan como causa raíz.',
        alignment: 'Que costo y condición observada cambien en la misma dirección no demuestra causalidad ni predice una falla futura.',
        human_authority: 'La comparación sirve para priorizar revisión; diagnóstico e intervención requieren validación humana.',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo comparar costo y condición del equipo' }, { status: 500 });
  }
}
