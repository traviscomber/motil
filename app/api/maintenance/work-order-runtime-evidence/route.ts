export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  if (!access.canWrite) return NextResponse.json({ error: 'Sin permiso de edición' }, { status: 403 });

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const workOrderId = String(body?.workOrderId || '').trim();
    const mode = String(body?.mode || '').trim();
    const notes = String(body?.notes || '').trim() || null;

    if (!workOrderId || !['meter_reading', 'not_available'].includes(mode)) {
      return NextResponse.json({ error: 'Evidencia de horómetro inválida' }, { status: 400 });
    }

    let meterHours: number | null = null;
    let recordedAt: string | null = null;
    let unavailableReason: string | null = null;

    if (mode === 'meter_reading') {
      meterHours = Number(body?.meterHours);
      recordedAt = String(body?.recordedAt || '').trim();
      if (!Number.isFinite(meterHours) || meterHours < 0 || !recordedAt || Number.isNaN(new Date(recordedAt).getTime())) {
        return NextResponse.json({ error: 'Ingresa una lectura y fecha válidas' }, { status: 400 });
      }
    } else {
      unavailableReason = String(body?.unavailableReason || '').trim();
      if (!unavailableReason) return NextResponse.json({ error: 'Indica por qué el horómetro no está disponible' }, { status: 400 });
    }

    const { data: workOrder, error: workOrderError } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,organization_id,canonical_asset_id,status')
      .eq('organization_id', context.organizationId)
      .eq('id', workOrderId)
      .maybeSingle();
    if (workOrderError) throw workOrderError;
    if (!workOrder) return NextResponse.json({ error: 'OT no pertenece a la organización' }, { status: 404 });

    const { data, error } = await context.supabase.rpc('record_work_order_runtime_evidence_v1', {
      p_work_order_id: workOrderId,
      p_meter_hours: meterHours,
      p_recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
      p_unavailable_reason: unavailableReason,
      p_notes: notes,
    });
    if (error) throw error;

    return NextResponse.json({ evidenceId: data, mode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la evidencia de horómetro' }, { status: 500 });
  }
}
