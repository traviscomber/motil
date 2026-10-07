export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('maintenance_notifications')
    .select('id,work_order_id,notification_type,title,message,read_at,created_at')
    .eq('organization_id', context.organizationId)
    .eq('recipient_profile_id', context.userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifications = data || [];
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read_at).length,
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = (await request.json().catch(() => null)) as { id?: string; all?: boolean } | null;
  const now = new Date().toISOString();

  let query = context.supabase
    .from('maintenance_notifications')
    .update({ read_at: now })
    .eq('organization_id', context.organizationId)
    .eq('recipient_profile_id', context.userId)
    .is('read_at', null);

  if (!body?.all) {
    if (!body?.id) return NextResponse.json({ error: 'Falta la notificación.' }, { status: 400 });
    query = query.eq('id', body.id);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
