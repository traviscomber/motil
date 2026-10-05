export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getSantiagoDate } from '@/lib/rrhh-readiness';
import { isReadinessPolicyStorageMissing, loadActiveReadinessPolicies } from '@/lib/rrhh-readiness-policy-store';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function cleanText(value: unknown, max = 180) {
  const result = String(value || '').trim();
  return result ? result.slice(0, max) : null;
}

function list(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanText(item)).filter(Boolean))) as string[];
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  const state = await loadActiveReadinessPolicies(context.supabase, context.organizationId);
  return NextResponse.json({
    policies: state.policies,
    available: state.available,
    error: state.error,
    migration_required: !state.available && !state.error,
    statement: state.available
      ? 'Las políticas activas son requisitos explícitos configurados por RRHH/HSE; MOTIL no infiere exigencias.'
      : 'El modelo de políticas está versionado pero aún no está aplicado en esta base.',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH write access required' }, { status: 403 });

  try {
    const body = await request.json();
    const siteName = cleanText(body?.site_name);
    const roleTitle = cleanText(body?.role_title);
    const credentials = list(body?.credentials);
    const competencies = list(body?.competencies);
    const epp = list(body?.epp);
    const requirements = [
      ...credentials.map((name) => ({ requirement_type: 'credential', requirement_name: name })),
      ...competencies.map((name) => ({ requirement_type: 'competency', requirement_name: name })),
      ...epp.map((name) => ({ requirement_type: 'epp', requirement_name: name })),
    ];

    if (!siteName) return NextResponse.json({ error: 'Faena es obligatoria' }, { status: 400 });
    if (!requirements.length) return NextResponse.json({ error: 'La política debe tener al menos un requisito explícito' }, { status: 400 });

    const policyState = await loadActiveReadinessPolicies(context.supabase, context.organizationId);
    if (!policyState.available) {
      return NextResponse.json({
        error: policyState.error || 'El modelo de políticas aún no está aplicado en la base',
        migration_required: !policyState.error,
      }, { status: 409 });
    }

    const { data: policy, error: policyError } = await context.supabase
      .from('rrhh_faena_readiness_policies')
      .insert({
        organization_id: context.organizationId,
        name: cleanText(body?.name) || ('Habilitación · ' + siteName + (roleTitle ? ' · ' + roleTitle : '')),
        site_name: siteName,
        role_title: roleTitle,
        status: 'active',
        effective_from: cleanText(body?.effective_from, 10) || getSantiagoDate(),
        notes: cleanText(body?.notes, 500),
        created_by: context.userId,
      })
      .select('id,name,site_name,role_title,status,effective_from,effective_to,notes')
      .single();

    if (policyError) {
      if (isReadinessPolicyStorageMissing(policyError)) {
        return NextResponse.json({ error: 'El modelo de políticas aún no está aplicado en la base', migration_required: true }, { status: 409 });
      }
      if (policyError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una política activa para esta faena y cargo' }, { status: 409 });
      }
      throw policyError;
    }

    const { data: insertedRequirements, error: requirementError } = await context.supabase
      .from('rrhh_faena_readiness_requirements')
      .insert(requirements.map((requirement) => ({
        ...requirement,
        organization_id: context.organizationId,
        policy_id: policy.id,
        created_by: context.userId,
      })))
      .select('id,policy_id,requirement_type,requirement_name,requirement_code,notes');

    if (requirementError) {
      await context.supabase
        .from('rrhh_faena_readiness_policies')
        .delete()
        .eq('organization_id', context.organizationId)
        .eq('id', policy.id);
      throw requirementError;
    }

    return NextResponse.json({ policy: { ...policy, requirements: insertedRequirements || [] } }, { status: 201 });
  } catch (error) {
    console.error('[rrhh/readiness-policies]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo crear la política de habilitación' }, { status: 500 });
  }
}
