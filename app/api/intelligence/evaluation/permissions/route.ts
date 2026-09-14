export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel } from '@/lib/api/module-access';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import {
  CRITICAL_PERMISSION_PROBES,
  evaluatePermissionProbe,
  PERMISSION_REGRESSION_POLICY,
} from '@/lib/intelligence/permission-regression';

export async function GET(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const reports = await Promise.all(
    CRITICAL_PERMISSION_PROBES.map(async (probe) => {
      const level = await getModuleAccessLevel(context.userId, access.role, probe.moduleKey);
      return evaluatePermissionProbe({
        probe,
        level,
        executiveDomainReadable: access.canRead(probe.domain),
        admin: access.admin,
      });
    }),
  );

  return NextResponse.json({
    pass: reports.every((report) => report.pass),
    userId: context.userId,
    organizationId: context.organizationId,
    role: access.role,
    admin: access.admin,
    authorizedDomains: access.domains,
    reports,
    policy: PERMISSION_REGRESSION_POLICY,
    operationalMutationExecuted: false,
    authority: 'diagnostic_read_only',
  });
}
