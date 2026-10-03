export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('user_action_states')
    .select('source_key, status, snoozed_until, updated_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'No se pudo cargar el estado de tus acciones' }, { status: 500 });
  return NextResponse.json({ states: data || [] });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const sourceKey = String(body?.sourceKey || '').trim();
  const status = String(body?.status || '').trim();
  if (!sourceKey || !['pending', 'read', 'snoozed'].includes(status)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  // Executive decision state is a personal UI preference. Critical executive
  // decisions are never filtered by snooze in the decision center itself.
  const isExecutiveState = sourceKey.startsWith('executive:');

  if (!isExecutiveState) {
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .select('cargo_id')
      .eq('id', context.userId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
    }
    if (!profile?.cargo_id) {
      return NextResponse.json({ error: 'Tu perfil no tiene un cargo operacional activo' }, { status: 403 });
    }

    const actionableResult = await context.supabase
      .from('role_tasks_actionable_v1')
      .select('task_key, severity')
      .eq('organization_id', context.organizationId)
      .eq('cargo_id', profile.cargo_id)
      .eq('task_key', sourceKey)
      .limit(1)
      .maybeSingle();

    if (actionableResult.error) {
      return NextResponse.json({ error: 'No se pudo validar la acción contra tu bandeja actual' }, { status: 500 });
    }

    let task = actionableResult.data;
    if (!task) {
      const escalationResult = await context.supabase
        .from('role_task_escalations_v1')
        .select('task_key, severity')
        .eq('organization_id', context.organizationId)
        .eq('cargo_id', profile.cargo_id)
        .eq('task_key', sourceKey)
        .limit(1)
        .maybeSingle();

      if (escalationResult.error) {
        return NextResponse.json({ error: 'No se pudo validar la acción contra tu bandeja actual' }, { status: 500 });
      }
      task = escalationResult.data;
    }

    if (!task) {
      return NextResponse.json({ error: 'La acción ya no está disponible para tu cargo' }, { status: 409 });
    }
    if (status === 'snoozed' && String(task.severity || '').toLowerCase() === 'critical') {
      return NextResponse.json({ error: 'Una acción crítica no puede posponerse' }, { status: 409 });
    }
  }

  const snoozedUntil = status === 'snoozed'
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await context.supabase.from('user_action_states').upsert({
    organization_id: context.organizationId,
    user_id: context.userId,
    source_key: sourceKey,
    status,
    snoozed_until: snoozedUntil,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,user_id,source_key' });

  if (error) return NextResponse.json({ error: 'No se pudo guardar el estado de la acción' }, { status: 500 });
  return NextResponse.json({ ok: true, status, snoozedUntil });
}
