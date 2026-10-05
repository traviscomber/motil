export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';
import { resolveMaintenanceViewerMode } from '@/lib/maintenance/viewer-mode';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .select('cargo_id')
      .eq('id', context.userId)
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

    const { data: creatorPerson, error: creatorPersonError } = await context.supabase
      .from('people')
      .select('id,full_name')
      .eq('organization_id', context.organizationId)
      .eq('profile_id', context.userId)
      .eq('employment_status', 'active')
      .maybeSingle();
    if (creatorPersonError) throw creatorPersonError;

    const canCreateWorkOrder = ['Ariel López', 'Mauricio Astudillo'].includes(String(creatorPerson?.full_name || ''));

    const accessLevel = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);

    return NextResponse.json({
      mode,
      cargoName,
      canEdit: accessLevel === 'ED',
      canCreateWorkOrder,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo resolver el contexto de mantenimiento' }, { status: 500 });
  }
}
