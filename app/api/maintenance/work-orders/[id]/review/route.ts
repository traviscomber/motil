export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { requireAssignedMaintenanceExecution } from '@/lib/maintenance/work-order-execution-access';

async function getReviewerPerson(context: Awaited<ReturnType<typeof getOrganizationContext>>) {
  if (!context.ok) return null;
  const { data, error } = await context.supabase
    .from('people')
    .select('id,full_name')
    .eq('organization_id', context.organizationId)
    .eq('profile_id', context.userId)
    .eq('employment_status', 'active')
    .maybeSingle();
  if (error || !data) return null;
  return ['Ariel López', 'Mauricio Astudillo'].includes(String(data.full_name || '')) ? data : null;
}

async function authorizeRead(request: NextRequest, workOrderId: string) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context;
  const accessLevel = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  if (accessLevel === 'ED') return context;
  const assigned = await requireAssignedMaintenanceExecution(context, workOrderId);
  if (!assigned.ok) return { ok: false as const, response: assigned.response };
  return context;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeRead(request, id);
  if (!context.ok) return context.response;

  const { data: workOrder, error: workOrderError } = await context.supabase
    .from('maintenance_work_orders')
    .select('id,status,work_order_number')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (workOrderError) return NextResponse.json({ error: workOrderError.message }, { status: 500 });
  if (!workOrder) return NextResponse.json({ error: 'No se encontró la orden de trabajo.' }, { status: 404 });

  const { data: review, error: reviewError } = await context.supabase
    .from('work_order_supervisor_reviews')
    .select('id,status,decision_note,reviewed_by_name,reviewed_at,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('work_order_id', id)
    .maybeSingle();
  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  const reviewer = await getReviewerPerson(context);
  return NextResponse.json({
    review: review || {
      status: String(workOrder.status || '') === 'completed' ? 'pending' : null,
      decision_note: null,
      reviewed_by_name: null,
      reviewed_at: null,
    },
    canApprove: Boolean(reviewer) && String(workOrder.status || '') === 'completed' && review?.status !== 'approved',
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const reviewer = await getReviewerPerson(context);
  if (!reviewer) {
    return NextResponse.json({ error: 'Solo Ariel López o Mauricio Astudillo pueden aprobar la OT.' }, { status: 403 });
  }

  const { data: workOrder, error: workOrderError } = await context.supabase
    .from('maintenance_work_orders')
    .select('id,status,work_order_number,canonical_asset_id')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (workOrderError) return NextResponse.json({ error: workOrderError.message }, { status: 500 });
  if (!workOrder) return NextResponse.json({ error: 'No se encontró la orden de trabajo.' }, { status: 404 });
  if (String(workOrder.status || '') !== 'completed') {
    return NextResponse.json({ error: 'La OT debe estar terminada antes de ser aprobada.' }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as { note?: string | null } | null;
  const note = body?.note?.trim() || null;
  const now = new Date().toISOString();

  const { data: review, error: reviewError } = await context.supabase
    .from('work_order_supervisor_reviews')
    .upsert({
      organization_id: context.organizationId,
      work_order_id: id,
      status: 'approved',
      decision_note: note,
      reviewed_by_profile_id: context.userId,
      reviewed_by_person_id: reviewer.id,
      reviewed_by_name: reviewer.full_name,
      reviewed_at: now,
      updated_at: now,
    }, { onConflict: 'organization_id,work_order_id' })
    .select('id,status,decision_note,reviewed_by_name,reviewed_at')
    .single();
  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  await context.supabase.from('work_order_events').insert({
    organization_id: context.organizationId,
    work_order_id: id,
    canonical_asset_id: workOrder.canonical_asset_id,
    event_type: 'supervisor_approved',
    event_at: now,
    actor_id: context.userId,
    actor_name: reviewer.full_name,
    source_table: 'public.work_order_supervisor_reviews',
    source_record_id: review.id,
    summary: 'OT aprobada por supervisión',
    payload: { status: 'approved', note },
  });

  return NextResponse.json({ review });
}
