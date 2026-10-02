export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveMaintenanceViewerMode } from '@/lib/maintenance/viewer-mode';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .select('cargo_id')
      .eq('id', access.user.id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
    if (profileError) throw profileError;

    let cargoName: string | null = null;
    if (profile?.cargo_id) {
      const { data: cargo, error: cargoError } = await context.supabase
        .from('cargos')
        .select('name')
        .eq('id', profile.cargo_id)
        .maybeSingle();
      if (cargoError) throw cargoError;
      cargoName = cargo?.name || null;
    }

    const mode = resolveMaintenanceViewerMode(cargoName);
    const mobileExecution = String(cargoName || '').trim().toLowerCase().startsWith('mecánico');

    const { data: creatorPerson, error: creatorPersonError } = await context.supabase
      .from('people')
      .select('id,full_name')
      .eq('organization_id', context.organizationId)
      .eq('profile_id', access.user.id)
      .eq('employment_status', 'active')
      .maybeSingle();
    if (creatorPersonError) throw creatorPersonError;

    const canCreateWorkOrder = ['Ariel López', 'Mauricio Astudillo'].includes(String(creatorPerson?.full_name || ''));

    return NextResponse.json({
      mode,
      cargoName,
      canEdit: access.canWrite,
      canCreateWorkOrder,
      mobileExecution,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo resolver el contexto de mantenimiento' }, { status: 500 });
  }
}
