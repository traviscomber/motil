export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSustainabilityContext, normalizeCorrectiveActionStatus, SupabaseServerClient } from '@/lib/api/sostenibilidad-mvp';

async function getOrganizationNcIds(supabase: SupabaseServerClient, organizationId: string) {
  const { data, error } = await supabase.from('sostenibilidad_nonconformances').select('id').eq('organization_id', organizationId);
  if (error) throw error;
  return (data || []).map((row) => row.id);
}

async function validateNcBelongsToOrganization(supabase: SupabaseServerClient, ncId: string, organizationId: string) {
  const { data, error } = await supabase.from('sostenibilidad_nonconformances').select('id').eq('id', ncId).eq('organization_id', organizationId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function resolveNcId(supabase: SupabaseServerClient, organizationId: string, ncId?: string | null, ncNumber?: string | null) {
  const normalizedNcId = normalizeText(ncId);
  if (normalizedNcId) return await validateNcBelongsToOrganization(supabase, normalizedNcId, organizationId) ? normalizedNcId : '';
  const normalizedNcNumber = normalizeText(ncNumber);
  if (!normalizedNcNumber) return '';
  const { data, error } = await supabase.from('sostenibilidad_nonconformances').select('id').eq('organization_id', organizationId).eq('nc_number', normalizedNcNumber).maybeSingle();
  if (error) throw error;
  return data?.id || '';
}

function normalizeText(value: unknown) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function normalizeDate(value: unknown) { const text = normalizeText(value); return text || null; }
function normalizeStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['planned', 'planificada', 'planificado', 'pending', 'pendiente'].includes(text)) return 'planned';
  if (['in_progress', 'en progreso', 'en_progreso', 'progress'].includes(text)) return 'in_progress';
  if (['completed', 'completada', 'completado', 'done', 'cerrada', 'cerrado'].includes(text)) return 'completed';
  if (['cancelled', 'cancelada', 'cancelado'].includes(text)) return 'cancelled';
  return 'planned';
}
function normalizeMoney(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;
  try {
    const ncId = request.nextUrl.searchParams.get('ncId') || request.nextUrl.searchParams.get('nc_id') || request.nextUrl.searchParams.get('nonconformanceId');
    const ncIds = await getOrganizationNcIds(context.supabase, context.organizationId);
    if (ncIds.length === 0) return NextResponse.json({ data: [], corrective_actions: [] });
    let query = context.supabase.from('sostenibilidad_corrective_actions').select('*').in('nc_id', ncIds).order('scheduled_completion_date', { ascending: true });
    if (ncId) query = query.eq('nc_id', ncId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).map((row) => ({ ...row, status: normalizeCorrectiveActionStatus(row.status) }));
    return NextResponse.json({ data: rows, corrective_actions: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las acciones correctivas';
    console.error('[sostenibilidad][corrective-actions] GET failed:', message);
    return NextResponse.json({ error: 'No se pudieron cargar las acciones correctivas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_RIESGOS, true);
  if (!access.authorized) return access.response;
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;
  try {
    const body = await request.json();
    const ncId = await resolveNcId(context.supabase, context.organizationId, body.ncId || body.nc_id, body.ncNumber || body.nc_number);
    if (!ncId) return NextResponse.json({ error: 'ncId or ncNumber is required' }, { status: 400 });
    if (!await validateNcBelongsToOrganization(context.supabase, ncId, context.organizationId)) return NextResponse.json({ error: 'Nonconformance not found' }, { status: 404 });
    const { data: existingForNc } = await context.supabase.from('sostenibilidad_corrective_actions').select('id').eq('nc_id', ncId);
    const caNumber = `CA-${new Date().getFullYear()}-${String(((existingForNc || []).length || 0) + 1).padStart(4, '0')}`;
    const { data, error } = await context.supabase.from('sostenibilidad_corrective_actions').insert({ nc_id: ncId, ca_number: caNumber, action_description: normalizeText(body.actionDescription || body.action_description), responsible_person: context.userId, responsible_person_name: normalizeText(body.responsiblePerson || context.userName || context.userEmail), scheduled_completion_date: normalizeDate(body.scheduledCompletionDate || body.scheduled_completion_date), status: normalizeStatus(body.status || 'planned'), verification_method: normalizeText(body.verificationMethod || body.verification_method || 'inspection'), estimated_cost: normalizeMoney(body.estimatedCost || body.estimated_cost || 0), updated_at: new Date().toISOString() }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ data, id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la acción correctiva';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_RIESGOS, true);
  if (!access.authorized) return access.response;
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;
  try {
    const body = await request.json();
    const ncId = await resolveNcId(context.supabase, context.organizationId, body.ncId || body.nc_id, body.ncNumber || body.nc_number);
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { data, error } = await context.supabase.from('sostenibilidad_corrective_actions').update({ action_description: body.action_description || body.actionDescription ? normalizeText(body.action_description || body.actionDescription) : undefined, responsible_person_name: body.responsible_person_name || body.responsiblePerson ? normalizeText(body.responsible_person_name || body.responsiblePerson) : undefined, scheduled_completion_date: body.scheduled_completion_date !== undefined || body.scheduledCompletionDate !== undefined ? normalizeDate(body.scheduled_completion_date || body.scheduledCompletionDate) : undefined, actual_completion_date: body.actual_completion_date !== undefined ? normalizeDate(body.actual_completion_date) : undefined, status: body.status ? normalizeStatus(body.status) : undefined, verification_method: body.verification_method || body.verificationMethod ? normalizeText(body.verification_method || body.verificationMethod) : null, estimated_cost: body.estimated_cost !== undefined ? normalizeMoney(body.estimated_cost) : body.estimatedCost !== undefined ? normalizeMoney(body.estimatedCost) : undefined, actual_cost: body.actual_cost !== undefined ? normalizeMoney(body.actual_cost) : undefined, updated_at: new Date().toISOString() }).eq('id', body.id).in('nc_id', ncId ? [ncId] : await getOrganizationNcIds(context.supabase, context.organizationId)).select('*').single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la acción correctiva';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
