export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import {
  evaluateFaenaReadiness,
  getSantiagoDate,
  selectCurrentAssignment,
  summarizeReadinessEvidence,
} from '@/lib/rrhh-readiness';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);
const BATCH_SIZE = 50;

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function chunks<T>(items: T[], size = BATCH_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function safeSearch(value: string) {
  return value.replace(/[%_,]/g, ' ').trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  try {
    const q = safeSearch(request.nextUrl.searchParams.get('q') || '');
    let peopleQuery = context.supabase
      .from('people')
      .select('id,full_name,rut,role_title,employment_status,source_type')
      .eq('organization_id', context.organizationId)
      .order('full_name')
      .limit(250);

    if (q) peopleQuery = peopleQuery.ilike('full_name', '%' + q + '%');

    const { data: people, error: peopleError } = await peopleQuery;
    if (peopleError) throw peopleError;

    const ids = (people || []).map((row) => row.id);
    const assignments: any[] = [];
    const credentials: any[] = [];
    const competencies: any[] = [];
    const epp: any[] = [];

    for (const batch of chunks(ids)) {
      const [assignmentResult, credentialResult, competencyResult, eppResult] = await Promise.all([
        context.supabase
          .from('people_employment_assignments')
          .select('id,person_id,site_name,shift_pattern,employment_type,role_title,area,start_date,end_date')
          .eq('organization_id', context.organizationId)
          .in('person_id', batch)
          .order('start_date', { ascending: false }),
        context.supabase
          .from('person_credentials')
          .select('person_id,status,expires_at')
          .eq('organization_id', context.organizationId)
          .in('person_id', batch),
        context.supabase
          .from('person_competencies')
          .select('person_id,status,expires_at')
          .eq('organization_id', context.organizationId)
          .in('person_id', batch),
        context.supabase
          .from('person_epp_assignments')
          .select('person_id,status,renewal_due_at,ended_at')
          .eq('organization_id', context.organizationId)
          .in('person_id', batch),
      ]);
      const error = assignmentResult.error || credentialResult.error || competencyResult.error || eppResult.error;
      if (error) throw error;
      assignments.push(...(assignmentResult.data || []));
      credentials.push(...(credentialResult.data || []));
      competencies.push(...(competencyResult.data || []));
      epp.push(...(eppResult.data || []));
    }

    const today = getSantiagoDate();
    const rows = (people || []).map((person) => {
      const assignment = selectCurrentAssignment(assignments.filter((row) => row.person_id === person.id), today);
      const evidence = summarizeReadinessEvidence({
        credentials: credentials.filter((row) => row.person_id === person.id),
        competencies: competencies.filter((row) => row.person_id === person.id),
        epp: epp.filter((row) => row.person_id === person.id),
        today,
      });
      const readiness = evaluateFaenaReadiness({
        employmentStatus: person.employment_status,
        assignment,
        evidence,
        policyConfigured: false,
      });
      return { ...person, person_id: person.id, assignment, evidence, readiness };
    });

    return NextResponse.json({
      people: rows,
      summary: {
        total: rows.length,
        ready: null,
        conditional: rows.filter((row) => row.readiness.status === 'conditional').length,
        blocked: rows.filter((row) => row.readiness.status === 'blocked').length,
        without_assignment: rows.filter((row) => !row.assignment).length,
        evidence_incomplete: rows.filter((row) => !row.readiness.evidence_complete).length,
      },
      policy: {
        configured: false,
        statement: 'MOTIL no declara APTO sin una política explícita de requisitos de faena.',
      },
      source: 'public.people + people_employment_assignments + person_credentials + person_competencies + person_epp_assignments',
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rrhh/readiness]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo calcular la habilitación para faena' }, { status: 500 });
  }
}
