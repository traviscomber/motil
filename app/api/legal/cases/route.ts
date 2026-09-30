export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

async function authorize(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return { ok: false as const, response: context.response };
  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return { ok: false as const, response: NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 }) };
  }
  return { ok: true as const, context, access };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.context.supabase
    .from('legal_cases')
    .select('*')
    .eq('organization_id', auth.context.organizationId)
    .order('status', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  return NextResponse.json({
    data: rows,
    summary: {
      total: rows.length,
      new: rows.filter((row) => row.status === 'new').length,
      in_review: rows.filter((row) => row.status === 'in_review').length,
      action_required: rows.filter((row) => row.status === 'action_required').length,
      waiting_area: rows.filter((row) => row.status === 'waiting_area').length,
      closed: rows.filter((row) => row.status === 'closed').length,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  if (auth.access !== 'ED') {
    return NextResponse.json({ error: 'Legal está en modo solo lectura para tu cargo' }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const allowedStatuses = new Set(['new','in_review','action_required','waiting_area','closed']);
  const allowedEvidence = new Set(['pending','partial','complete','not_required']);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!allowedStatuses.has(body.status)) return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    payload.status = body.status;
    payload.closed_at = body.status === 'closed' ? new Date().toISOString() : null;
  }
  if (body.evidence_status !== undefined) {
    if (!allowedEvidence.has(body.evidence_status)) return NextResponse.json({ error: 'evidence_status inválido' }, { status: 400 });
    payload.evidence_status = body.evidence_status;
  }
  if (body.legal_owner !== undefined) payload.legal_owner = String(body.legal_owner || '').trim() || null;
  if (body.action_required !== undefined) payload.action_required = String(body.action_required || '').trim() || null;

  const { data, error } = await auth.context.supabase
    .from('legal_cases')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', auth.context.organizationId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
