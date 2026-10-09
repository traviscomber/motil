export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { assessPlanPeriod, currentChileDate } from '@/lib/production/engineering-plan-period.mjs';
import { summarizeCanonicalMonthlyPlan } from '@/lib/production/engineering-plan-metrics.mjs';
import { summarizeEngineeringSourceReadiness } from '@/lib/production/engineering-source-readiness.mjs';
import { listSernageominObligations } from '@/lib/intelligence/sernageomin-obligations';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_TOPOGRAFIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [plan, sectors] = await Promise.all([
    context.supabase.from('production_monthly_plans').select('*')
      .eq('organization_id', context.organizationId).eq('status','active')
      .order('period_start',{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from('production_mine_sectors')
      .select('id,mine_source_id,name,status').eq('organization_id',context.organizationId),
  ]);

  const error = plan.error || sectors.error;
  if (error) return NextResponse.json({ error: 'No se pudo consultar el plan de Topografía.' },
    { status: 503, headers: { 'Cache-Control':'private, no-store' } });

  const activePlan = plan.data || null;
  const planPeriod = assessPlanPeriod(activePlan, currentChileDate());
  const planLineResult = activePlan
    ? await context.supabase.from('production_monthly_plan_lines')
        .select('id,plan_id,line_type,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_advance_m,planned_drilling_m,planned_shots,planned_trips_per_day,priority,source_page,source_reference',{count:'exact'})
        .eq('organization_id',context.organizationId).eq('plan_id',activePlan.id)
        .order('priority',{ascending:true}).limit(300)
    : { data: [], count: 0, error: null };
  if (planLineResult.error) return NextResponse.json(
    { error: 'No se pudo verificar el desglose del plan.' }, { status: 503,
      headers: { 'Cache-Control':'private, no-store' } });
  const planLines = planLineResult.data || [];
  const metrics = summarizeCanonicalMonthlyPlan(activePlan,planLines,planLineResult.count);
  // Historical drilling reports are evidence of source availability only.
  // They are not accepted topographic measurements or validated production.
  const reportsResult = activePlan
    ? await context.supabase.from('production_drilling_source_reports')
        .select('operation_date,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,drilled_meters,mine_raw,sector_raw',{count:'exact'})
        .eq('organization_id',context.organizationId)
        .gte('operation_date',activePlan.period_start)
        .lte('operation_date',activePlan.period_end)
        .order('operation_date',{ascending:false}).limit(1200)
    : { data: [], count: null, error: null };
  if(reportsResult.error)return NextResponse.json(
    {error:'No se pudo verificar la integridad de las fuentes de perforación.'},
    {status:503,headers:{'Cache-Control':'private, no-store'}});
  const readiness=summarizeEngineeringSourceReadiness(
    planPeriod,reportsResult.data||[],reportsResult.count);


  return NextResponse.json({
    plan: activePlan,
    planPeriod,
    summary: {
      canonicalSectors: (sectors.data || []).length,
      planLines: planLineResult.count ?? planLines.length,
      plannedAdvanceM: metrics.summary.plannedAdvanceM,
      plannedDrillingM: metrics.summary.plannedDrillingM,
      plannedTons: metrics.summary.plannedTons,
      wasteTons: metrics.summary.wasteTons,
      totalMovementTons: metrics.summary.totalMovementTons,
      actualSurveyPoints: null,
      actualAdvanceM: null,
    },
    breakdown: metrics.breakdown,
    readiness,
    regulatoryGuidance: {
      authority: 'SERNAGEOMIN',
      source: 'canonical_sernageomin_obligations',
      items: listSernageominObligations('engineering').map(item => ({
        id: item.id, title: item.title, legalBasis: item.legalBasis,
        sourceUrl: item.sourceUrl, businessOwner: item.businessOwner,
        nextAction: item.nextAction, applicabilityNote: item.applicabilityNote,
        expectedEvidence: item.expectedEvidence,
      })),
      humanValidationRequired: true,
      complianceVerdictCalculated: false,
      roleAssignmentVerified: false,
    },
    lines: planLines,
    intelligenceStatus: {
      surveyCanonical: false,
      coordinatesCanonical: false,
      actualAdvanceCanonical: false,
      note: 'Topografía dispone hoy del plan espacial/operacional y del maestro de sectores, pero no existe todavía una fuente canónica de levantamientos, coordenadas, cotas o avance topográfico real. MOTIL no simula esos valores.',
    },
  }, { headers: { 'Cache-Control':'private, no-store' } });
}
