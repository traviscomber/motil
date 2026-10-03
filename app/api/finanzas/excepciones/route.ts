export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const DETAIL_ISSUES = new Set([
  'zero_amount_lines',
  'missing_cost_centers',
  'source_warning_lines',
  'unlinked_products',
]);

const QUALITY_ALERT_CODES = [
  'validation',
  'zero_amount_lines',
  'missing_cost_centers',
  'source_warning_lines',
  'unlinked_products',
];

async function loadValidation(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }) {
  const { data: run, error: runError } = await context.supabase
    .from('financial_validation_runs')
    .select('id,started_at,completed_at,status,total_checks,failed_checks,canonical_events,recognized_clp,committed_clp,notes')
    .eq('organization_id', context.organizationId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) throw runError;
  if (!run?.id) return { run: null, results: [] };

  const { data: results, error: resultsError } = await context.supabase
    .from('financial_validation_results')
    .select('id,check_code,scope,population,exceptions,source_total,ledger_total,difference,status,details')
    .eq('run_id', run.id)
    .order('check_code', { ascending: true });

  if (resultsError) throw resultsError;
  return { run, results: results || [] };
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const issue = request.nextUrl.searchParams.get('issue')?.trim() || null;

  try {
    const { data: alerts, error: alertsError } = await context.supabase
      .from('canonical_finance_alerts')
      .select('alert_code,title,severity,exception_count,description')
      .eq('organization_id', context.organizationId)
      .in('alert_code', QUALITY_ALERT_CODES)
      .gt('exception_count', 0)
      .order('severity', { ascending: true })
      .order('alert_code', { ascending: true });

    if (alertsError) throw alertsError;

    let rows: Record<string, unknown>[] = [];
    if (issue && DETAIL_ISSUES.has(issue)) {
      const { data, error } = await context.supabase
        .from('finance_purchase_line_exceptions_v1')
        .select('exception_kind,line_id,purchase_order_id,order_number,line_number,product_code,description,quantity,unit,unit_cost,net_amount,cost_center_code,validation_status,validation_notes,source_file,source_sheet,source_row,imported_at,supplier_name,source_date,recommended_action')
        .eq('organization_id', context.organizationId)
        .eq('exception_kind', issue)
        .order('source_file', { ascending: true })
        .order('source_row', { ascending: true, nullsFirst: false })
        .limit(500);

      if (error) throw error;
      rows = (data || []) as Record<string, unknown>[];
    }

    const validation = await loadValidation(context);

    return NextResponse.json({
      issue,
      alerts: alerts || [],
      rows,
      validation,
      canRunValidation: access.canWrite,
      generatedAt: new Date().toISOString(),
      source: 'canonical_finance_alerts + finance_purchase_line_exceptions_v1',
    });
  } catch (error) {
    console.error('[finance-exceptions] read failed', error);
    return NextResponse.json(
      { error: 'No se pudo cargar las excepciones financieras' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: runId, error: runError } = await context.supabase.rpc(
      'run_canonical_financial_validation',
      { p_organization_id: context.organizationId },
    );

    if (runError) throw runError;
    const validation = await loadValidation(context);

    return NextResponse.json({
      ok: true,
      runId,
      validation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[finance-exceptions] validation failed', error);
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la validación financiera';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
