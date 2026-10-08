export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

function mineCodeFromCargo(name: string | null | undefined): 'PEUMO' | 'DON_JAIME' | null {
  const normalized = String(name || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
  if (normalized === 'jefe mina peumo') return 'PEUMO';
  if (normalized === 'jefe mina don jaime') return 'DON_JAIME';
  return null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'Sin acceso a mantenimiento' }, { status: 403 });
  }
  const { data: profile, error: profileError } = await context.supabase.from('profiles')
    .select('cargo_id').eq('id', context.userId).eq('organization_id', context.organizationId).maybeSingle();
  if (profileError || !profile?.cargo_id) return NextResponse.json({ error: 'Cargo no disponible' }, { status: 403 });
  const { data: cargo, error: cargoError } = await context.supabase.from('cargos')
    .select('name').eq('id', profile.cargo_id).maybeSingle();
  if (cargoError) return NextResponse.json({ error: 'Cargo no disponible' }, { status: 500 });
  const code = mineCodeFromCargo(cargo?.name);
  if (!code) return NextResponse.json({ error: 'No existe una mina asignada a este cargo' }, { status: 403 });
  const { data: mine, error: mineError } = await context.supabase.from('production_mine_sources')
    .select('id,name,code,cost_center_id').eq('organization_id', context.organizationId).eq('code', code).maybeSingle();
  if (mineError || !mine?.cost_center_id) {
    return NextResponse.json({ error: 'Centro de costo minero sin resolver' }, { status: 503 });
  }
  const { count, error: countError } = await context.supabase.from('maintenance_work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId).eq('cost_center_id', mine.cost_center_id);
  if (countError) return NextResponse.json({ error: 'No se pudo consultar las OT' }, { status: 503 });
  return NextResponse.json({
    mine: { id: mine.id, name: mine.name, code: mine.code },
    workOrdersLinkedToMine: count,
    completenessVerified: false,
    note: 'Sólo OT vinculadas al centro de costo. Las OT sin vínculo no pueden atribuirse a esta mina.',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
