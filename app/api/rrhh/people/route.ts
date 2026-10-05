export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { assessReadinessPolicy, evaluateFaenaReadiness, getSantiagoDate, selectCurrentAssignment, selectReadinessPolicy, summarizeReadinessEvidence } from '@/lib/rrhh-readiness';
import { loadActiveReadinessPolicies } from '@/lib/rrhh-readiness-policy-store';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  const personId = new URL(request.url).searchParams.get('person_id');

  try {
    if (personId) {
      const { data: person, error: personError } = await context.supabase
        .from('people')
        .select('id,full_name,rut,email,phone,role_title,cost_center_id,supervisor_person_id,employment_status,profile_id,source_type,source_reference,created_at,updated_at')
        .eq('organization_id', context.organizationId)
        .eq('id', personId)
        .maybeSingle();
      if (personError) throw personError;
      if (!person) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });

      const [assignments, cases, competencies, credentials, epp, evaluations, operatorActivity, workOrders] = await Promise.all([
        context.supabase.from('people_employment_assignments').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('start_date', { ascending: false }),
        context.supabase.from('people_case_events').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('event_date', { ascending: false }),
        context.supabase.from('person_competencies').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('created_at', { ascending: false }),
        context.supabase.from('person_credentials').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('created_at', { ascending: false }),
        context.supabase.from('person_epp_assignments').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('assigned_at', { ascending: false }),
        context.supabase.from('person_performance_evaluations').select('*').eq('organization_id', context.organizationId).eq('person_id', personId).order('period_end', { ascending: false }),
        context.supabase.from('production_operator_activity').select('id,operation_date,shift_code,worker_type,role_snapshot,canonical_asset_id,activity_type,activity_status,planned_hours,actual_hours,output_quantity,output_unit,checklist_completed,safety_observation,incident_id,notes,created_at').eq('organization_id', context.organizationId).eq('person_id', personId).order('operation_date', { ascending: false }).limit(100),
        context.supabase.from('maintenance_work_orders').select('id,work_order_number,title,status,priority,work_type,scheduled_date,completion_date,planned_duration_hours,actual_duration_hours,canonical_asset_id').eq('organization_id', context.organizationId).eq('assigned_person_id', personId).order('created_at', { ascending: false }).limit(100),
      ]);

      const queries = [assignments, cases, competencies, credentials, epp, evaluations, operatorActivity, workOrders];
      const failed = queries.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const today = getSantiagoDate();
      const assignment = selectCurrentAssignment(assignments.data || [], today);
      const policyState = await loadActiveReadinessPolicies(context.supabase, context.organizationId);
      const policy = policyState.available ? selectReadinessPolicy(policyState.policies, assignment, today) : null;
      const assessment = assessReadinessPolicy({
        policy,
        credentials: credentials.data || [],
        competencies: competencies.data || [],
        epp: epp.data || [],
        today,
      });
      const readiness = evaluateFaenaReadiness({
        employmentStatus: person.employment_status,
        assignment,
        evidence: summarizeReadinessEvidence({
          credentials: credentials.data || [],
          competencies: competencies.data || [],
          epp: epp.data || [],
          today,
        }),
        policyConfigured: policyState.available && assessment.configured,
        requirementsSatisfied: assessment.satisfied,
        requirementGaps: assessment.gaps,
      });

      return NextResponse.json({
        person,
        readiness,
        readinessPolicy: policy ? { ...policy, requirement_count: assessment.requirement_count } : null,
        readinessPolicySource: { available: policyState.available, error: policyState.error },
        assignments: assignments.data || [],
        cases: cases.data || [],
        competencies: competencies.data || [],
        credentials: credentials.data || [],
        epp: epp.data || [],
        evaluations: evaluations.data || [],
        operatorActivity: operatorActivity.data || [],
        workOrders: workOrders.data || [],
      });
    }

    const { data: people, error } = await context.supabase
      .from('people')
      .select('id,full_name,rut,email,phone,role_title,cost_center_id,supervisor_person_id,employment_status,profile_id,source_type,source_reference,updated_at')
      .eq('organization_id', context.organizationId)
      .order('full_name');
    if (error) throw error;

    const ids = (people || []).map((person) => person.id);
    const [caseRows, evaluationRows, activityRows, workOrderRows] = ids.length ? await Promise.all([
      context.supabase.from('people_case_events').select('person_id,review_status').eq('organization_id', context.organizationId).in('person_id', ids),
      context.supabase.from('person_performance_evaluations').select('person_id,overall_score,status,period_end').eq('organization_id', context.organizationId).in('person_id', ids),
      context.supabase.from('production_operator_activity').select('person_id').eq('organization_id', context.organizationId).in('person_id', ids),
      context.supabase.from('maintenance_work_orders').select('assigned_person_id,status').eq('organization_id', context.organizationId).in('assigned_person_id', ids),
    ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

    const aggregate = (id: string) => {
      const evals = (evaluationRows.data || []).filter((row) => row.person_id === id && row.status === 'finalized');
      const latest = evals.sort((a, b) => String(b.period_end).localeCompare(String(a.period_end)))[0];
      return {
        caseCount: (caseRows.data || []).filter((row) => row.person_id === id).length,
        openCaseCount: (caseRows.data || []).filter((row) => row.person_id === id && row.review_status !== 'closed').length,
        evaluationCount: evals.length,
        latestScore: latest?.overall_score ?? null,
        activityCount: (activityRows.data || []).filter((row) => row.person_id === id).length,
        workOrderCount: (workOrderRows.data || []).filter((row) => row.assigned_person_id === id).length,
      };
    };

    return NextResponse.json({ people: (people || []).map((person) => ({ ...person, evidence: aggregate(person.id) })) });
  } catch (error) {
    console.error('[rrhh/people]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar RRHH' }, { status: 500 });
  }
}
