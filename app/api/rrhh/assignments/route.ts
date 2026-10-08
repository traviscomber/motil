export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function cleanOptional(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function validDate(value: unknown) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) {
    return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const personId = String(body?.person_id || '').trim();
    const roleTitle = cleanOptional(body?.role_title);
    const area = cleanOptional(body?.area);
    const siteName = cleanOptional(body?.site_name);
    const supervisorPersonId = cleanOptional(body?.supervisor_person_id);
    const shiftPattern = cleanOptional(body?.shift_pattern);
    const employmentType = cleanOptional(body?.employment_type);
    const startDate = validDate(body?.start_date);

    if (!personId) return NextResponse.json({ error: 'person_id es obligatorio' }, { status: 400 });
    if (!startDate) return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 });
    if (supervisorPersonId === personId) {
      return NextResponse.json({ error: 'La persona no puede ser su propio supervisor' }, { status: 400 });
    }

    const { data: person, error: personError } = await context.supabase
      .from('people')
      .select('id,full_name,role_title')
      .eq('organization_id', context.organizationId)
      .eq('id', personId)
      .maybeSingle();
    if (personError) throw personError;
    if (!person) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });

    if (supervisorPersonId) {
      const { data: supervisor, error: supervisorError } = await context.supabase
        .from('people')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('id', supervisorPersonId)
        .eq('employment_status', 'active')
        .maybeSingle();
      if (supervisorError) throw supervisorError;
      if (!supervisor) {
        return NextResponse.json({ error: 'Supervisor no válido para esta organización' }, { status: 400 });
      }
    }

    const { data: activeAssignments, error: activeError } = await context.supabase
      .from('people_employment_assignments')
      .select('id,start_date')
      .eq('organization_id', context.organizationId)
      .eq('person_id', personId)
      .is('end_date', null)
      .order('start_date', { ascending: false });
    if (activeError) throw activeError;

    if ((activeAssignments || []).length > 1) {
      return NextResponse.json(
        { error: 'Existen múltiples asignaciones vigentes. Requiere revisión antes de continuar.' },
        { status: 409 },
      );
    }

    if ((activeAssignments || []).length === 1) {
      const { error: closeError } = await context.supabase
        .from('people_employment_assignments')
        .update({
          end_date: startDate,
          end_reason: 'Reasignación desde RRHH MOTIL',
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', context.organizationId)
        .eq('id', activeAssignments[0].id);
      if (closeError) throw closeError;
    }

    const { data: assignment, error: insertError } = await context.supabase
      .from('people_employment_assignments')
      .insert({
        organization_id: context.organizationId,
        person_id: personId,
        role_title: roleTitle || person.role_title,
        area,
        site_name: siteName,
        supervisor_person_id: supervisorPersonId,
        shift_pattern: shiftPattern,
        employment_type: employmentType,
        start_date: startDate,
        source_type: 'manual',
        source_reference: 'RRHH MOTIL',
        created_by: context.userId,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;

    const { error: syncError } = await context.supabase
      .from('people')
      .update({
        role_title: roleTitle || person.role_title,
        supervisor_person_id: supervisorPersonId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', context.organizationId)
      .eq('id', personId);
    if (syncError) throw syncError;

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('[rrhh/assignments POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar la asignación' },
      { status: 500 },
    );
  }
}
