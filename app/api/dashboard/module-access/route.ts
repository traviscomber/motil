export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getUserModuleAccess, isAdminRole } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { access, hasCargo } = await getUserModuleAccess(context.userId);
  const allModules = isAdminRole(context.role);
  return NextResponse.json(
    { hasCargo, access, allModules },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
