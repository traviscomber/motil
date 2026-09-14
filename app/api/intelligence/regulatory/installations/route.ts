export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRegulatoryInstallationContext } from '@/lib/intelligence/regulatory-installation-context';

export async function GET() {
  const context = getRegulatoryInstallationContext();

  return NextResponse.json({
    ...context,
    authority: 'reference_only',
    operationalMutationExecuted: false,
    persistence: 'regulatory_installation_context_v1',
  });
}
