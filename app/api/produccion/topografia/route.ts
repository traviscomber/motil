export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { assessPlanPeriod, currentChileDate } from '@/lib/production/engineering-plan-period.mjs';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_TOPOGRAFIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [plan, lines, sectors] = await Promise.all([
    context.supabase.from('production_monthly_plans').select('*').eq('organization_id', context.organizationId).eq('status','active').order('period_start',{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from('production_monthly_plan_lines').select('id,plan_id,line_type,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_advance_m,planned_drilling_m,planned_shots,planned_trips_per_day,priority,source_page,source_reference').eq('organization_id',context.organizationId).order('priority',{ascending:true}),
    context.supabase.from('production_mine_sectors').select('id,mine_source_id,name,status').eq('organization_id',context.organizationId),
  ]);

  const error = plan.error || lines.error || sectors.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activePlan = plan.data || null;
  const planPeriod = assessPlanPeriod(activePlan, currentChileDate());
  const planLines = activePlan ? (lines.data || []).filter((l)=>l.plan_id===activePlan.id) : [];
  const plannedAdvanceM = planLines.reduce((sum,l)=>sum+Number(l.planned_advance_m||0),0);
  const plannedDrillingM = planLines.reduce((sum,l)=>sum+Number(l.planned_drilling_m||0),0);
  const plannedTons = planLines.reduce((sum,l)=>sum+Number(l.planned_tons||0),0);

  return NextResponse.json({
    plan: activePlan,
    planPeriod,
    summary: {
      canonicalSectors: (sectors.data || []).length,
      planLines: planLines.length,
      plannedAdvanceM,
      plannedDrillingM,
      plannedTons,
      actualSurveyPoints: null,
      actualAdvanceM: null,
    },
    lines: planLines,
    intelligenceStatus: {
      surveyCanonical: false,
      coordinatesCanonical: false,
      actualAdvanceCanonical: false,
      note: 'Topografía dispone hoy del plan espacial/operacional y del maestro de sectores, pero no existe todavía una fuente canónica de levantamientos, coordenadas, cotas o avance topográfico real. MOTIL no simula esos valores.',
    },
  });
}
