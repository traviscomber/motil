export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);
const employmentStatuses = new Set(['active', 'inactive', 'suspended', 'terminated']);

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function cleanOptional(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmploymentStatus(value: unknown) {
  const status = String(value || 'active').trim().toLowerCase();
  return employmentStatuses.has(status) ? status : null;
}

async function findDuplicate(
  supabase: any,
  organizationId: string,
  rut: string | null,
  email: string | null,
  excludeId?: string,
) {
  if (rut) {
    let query = supabase
      .from('people')
      .select('id,full_name')
      .eq('organization_id', organizationId)
      .eq('rut', rut);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) return { field: 'RUT', person: data };
  }

  if (email) {
    let query = supabase
      .from('people')
      .select('id,full_name')
      .eq('organization_id', organizationId)
      .ilike('email', email);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) return { field: 'correo', person: data };
  }

  return null;
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

      return NextResponse.json({
        person,
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

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  try {
    const body = await request.json();
    const fullName = String(body?.full_name || '').trim();
    const rut = cleanOptional(body?.rut);
    const email = cleanOptional(body?.email)?.toLowerCase() || null;
    const phone = cleanOptional(body?.phone);
    const roleTitle = cleanOptional(body?.role_title);
    const employmentStatus = normalizeEmploymentStatus(body?.employment_status);

    if (!fullName) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    if (!employmentStatus) return NextResponse.json({ error: 'Estado laboral inválido' }, { status: 400 });

    const duplicate = await findDuplicate(context.supabase, context.organizationId, rut, email);
    if (duplicate) {
      return NextResponse.json(
        { error: `Ya existe una persona con ese ${duplicate.field}: ${duplicate.person.full_name}` },
        { status: 409 },
      );
    }

    const { data: person, error } = await context.supabase
      .from('people')
      .insert({
        organization_id: context.organizationId,
        full_name: fullName,
        normalized_name: normalizeName(fullName),
        rut,
        email,
        phone,
        role_title: roleTitle,
        employment_status: employmentStatus,
        source_type: 'manual',
        source_reference: 'RRHH MOTIL',
      })
      .select('id,full_name,rut,email,phone,role_title,employment_status,profile_id,source_type,source_reference,updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      person: {
        ...person,
        evidence: {
          caseCount: 0,
          openCaseCount: 0,
          evaluationCount: 0,
          latestScore: null,
          activityCount: 0,
          workOrderCount: 0,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[rrhh/people POST]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo crear la persona' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  try {
    const body = await request.json();
    const personId = String(body?.person_id || '').trim();
    const fullName = String(body?.full_name || '').trim();
    const rut = cleanOptional(body?.rut);
    const email = cleanOptional(body?.email)?.toLowerCase() || null;
    const phone = cleanOptional(body?.phone);
    const roleTitle = cleanOptional(body?.role_title);
    const employmentStatus = normalizeEmploymentStatus(body?.employment_status);

    if (!personId) return NextResponse.json({ error: 'person_id es obligatorio' }, { status: 400 });
    if (!fullName) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    if (!employmentStatus) return NextResponse.json({ error: 'Estado laboral inválido' }, { status: 400 });

    const { data: existing, error: existingError } = await context.supabase
      .from('people')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', personId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });

    const duplicate = await findDuplicate(context.supabase, context.organizationId, rut, email, personId);
    if (duplicate) {
      return NextResponse.json(
        { error: `Ya existe una persona con ese ${duplicate.field}: ${duplicate.person.full_name}` },
        { status: 409 },
      );
    }

    const { data: person, error } = await context.supabase
      .from('people')
      .update({
        full_name: fullName,
        normalized_name: normalizeName(fullName),
        rut,
        email,
        phone,
        role_title: roleTitle,
        employment_status: employmentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', context.organizationId)
      .eq('id', personId)
      .select('id,full_name,rut,email,phone,role_title,employment_status,profile_id,source_type,source_reference,updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ person });
  } catch (error) {
    console.error('[rrhh/people PATCH]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la persona' }, { status: 500 });
  }
}
