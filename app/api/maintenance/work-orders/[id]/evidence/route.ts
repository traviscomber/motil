export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, getModuleAccessLevel } from '@/lib/api/module-access';
import { requireAssignedMaintenanceExecution } from '@/lib/maintenance/work-order-execution-access';
import { requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';
import { requireOperationalMaintenanceWorkOrder } from '@/lib/maintenance/work-order-scope';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_BYTES = 12 * 1024 * 1024;

async function authorize(request: NextRequest, workOrderId: string) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context;
  const accessLevel = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  if (accessLevel === 'ED') return { ...context, executionPersonId: null as string | null };
  const executionAccess = await requireAssignedMaintenanceExecution(context, workOrderId);
  if (!executionAccess.ok) return { ok: false as const, response: executionAccess.response };
  return { ...context, executionPersonId: executionAccess.personId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorize(request, id);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('work_order_evidence_files')
    .select('id,evidence_type,file_name,mime_type,size_bytes,notes,captured_at,created_at')
    .eq('organization_id', context.organizationId)
    .eq('work_order_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evidence: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorize(request, id);
  if (!context.ok) return context.response;

  try {
    const guard = await requireOperationalMaintenanceWorkOrder(context.supabase, context.organizationId, id);
    if (!guard.ok) return NextResponse.json({ error: guard.error, record_scope: guard.scope }, { status: guard.status });

    const form = await request.formData();
    const file = form.get('file');
    const notes = String(form.get('notes') || '').trim() || null;
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una foto como evidencia.' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP o HEIC.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'La foto debe pesar menos de 12 MB.' }, { status: 400 });

    const { data: workOrder, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,status')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();
    if (woError) throw woError;
    if (!workOrder) return NextResponse.json({ error: 'No se encontró la orden de trabajo.' }, { status: 404 });
    if (['completed', 'closed', 'cancelled', 'canceled'].includes(String(workOrder.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'La OT ya no admite nueva evidencia de ejecución.' }, { status: 409 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const evidenceId = crypto.randomUUID();
    const storagePath = `${context.organizationId}/${id}/${evidenceId}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bucket = context.supabase.storage.from('maintenance-work-order-evidence');
    const { error: uploadError } = await bucket.upload(storagePath, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data, error } = await context.supabase
      .from('work_order_evidence_files')
      .insert({
        id: evidenceId,
        organization_id: context.organizationId,
        work_order_id: id,
        evidence_type: 'photo',
        storage_bucket: 'maintenance-work-order-evidence',
        storage_path: storagePath,
        file_name: file.name || `evidence-${evidenceId}.${ext}`,
        mime_type: file.type,
        size_bytes: file.size,
        notes,
        captured_at: new Date().toISOString(),
        created_by: context.userId,
      })
      .select('id,evidence_type,file_name,mime_type,size_bytes,notes,captured_at,created_at')
      .single();

    if (error) {
      await bucket.remove([storagePath]);
      throw error;
    }

    await context.supabase.from('work_order_events').insert({
      organization_id: context.organizationId,
      work_order_id: id,
      event_type: 'execution_evidence_added',
      event_at: new Date().toISOString(),
      actor_id: context.userId,
      actor_name: context.userName || context.userEmail || null,
      source_table: 'public.work_order_evidence_files',
      source_record_id: evidenceId,
      summary: 'Evidencia fotográfica de ejecución agregada',
      payload: { evidence_id: evidenceId, mime_type: file.type, size_bytes: file.size },
    });

    return NextResponse.json({ evidence: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la evidencia.' }, { status: 500 });
  }
}
