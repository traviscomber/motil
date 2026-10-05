export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);
const allowedKinds = new Set(['assignment', 'credential', 'competency', 'epp']);

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function textField(value: unknown, max = 180) {
  const valueText = String(value || '').trim();
  return valueText ? valueText.slice(0, max) : null;
}

function requiredText(value: unknown, label: string, max = 180) {
  const result = textField(value, max);
  if (!result) throw new Error(label + ' es obligatorio');
  return result;
}

function dateField(value: unknown, label: string, required = false) {
  const result = textField(value, 10);
  if (!result) {
    if (required) throw new Error(label + ' es obligatoria');
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(label + ' debe usar formato YYYY-MM-DD');
  return result;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH write access required' }, { status: 403 });

  try {
    const body = await request.json();
    const kind = String(body?.kind || '').trim();
    const personId = requiredText(body?.person_id, 'person_id', 64);

    if (!allowedKinds.has(kind)) {
      return NextResponse.json({ error: 'Tipo de evidencia no soportado' }, { status: 400 });
    }

    const { data: person, error: personError } = await context.supabase
      .from('people')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', personId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });

    const source = {
      organization_id: context.organizationId,
      person_id: personId,
      source_type: 'motil_rrhh_manual',
      source_reference: 'user:' + context.userId,
    };

    let result: { data: any; error: any };

    if (kind === 'assignment') {
      result = await context.supabase
        .from('people_employment_assignments')
        .insert({
          ...source,
          site_name: textField(body?.site_name),
          shift_pattern: textField(body?.shift_pattern),
          role_title: textField(body?.role_title),
          area: textField(body?.area),
          employment_type: textField(body?.employment_type),
          start_date: dateField(body?.start_date, 'Fecha de inicio', true),
          end_date: dateField(body?.end_date, 'Fecha de término'),
          created_by: context.userId,
        })
        .select('*')
        .single();
    } else if (kind === 'credential') {
      result = await context.supabase
        .from('person_credentials')
        .insert({
          ...source,
          credential_type: requiredText(body?.credential_type, 'Tipo de credencial'),
          credential_name: requiredText(body?.credential_name, 'Nombre de credencial'),
          credential_number: textField(body?.credential_number),
          issued_at: dateField(body?.issued_at, 'Fecha de emisión'),
          expires_at: dateField(body?.expires_at, 'Fecha de vencimiento'),
          status: 'valid',
        })
        .select('*')
        .single();
    } else if (kind === 'competency') {
      result = await context.supabase
        .from('person_competencies')
        .insert({
          ...source,
          competency_name: requiredText(body?.competency_name, 'Competencia'),
          level: textField(body?.level),
          verified_at: dateField(body?.verified_at, 'Fecha de verificación'),
          expires_at: dateField(body?.expires_at, 'Fecha de vencimiento'),
          status: 'valid',
        })
        .select('*')
        .single();
    } else {
      result = await context.supabase
        .from('person_epp_assignments')
        .insert({
          ...source,
          epp_name: requiredText(body?.epp_name, 'EPP'),
          assigned_at: dateField(body?.assigned_at, 'Fecha de entrega', true),
          renewal_due_at: dateField(body?.renewal_due_at, 'Fecha de renovación'),
          status: 'assigned',
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({
      ok: true,
      kind,
      record: result.data,
      source: 'manual_rrhh',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la evidencia de habilitación';
    const status = /obligatori|formato|soportado/i.test(message) ? 400 : 500;
    console.error('[rrhh/people/evidence]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
