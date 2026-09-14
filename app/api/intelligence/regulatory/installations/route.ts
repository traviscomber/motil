export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRegulatoryInstallationContext } from '@/lib/intelligence/regulatory-installation-context';
import {
  RES_0886_STAGE3_CANDIDATES,
  RES_0886_STAGE3_POLICY,
} from '@/lib/intelligence/res0886-stage3-candidates';

export async function GET() {
  const context = getRegulatoryInstallationContext();

  return NextResponse.json({
    ...context,
    stage3Extraction: {
      candidates: RES_0886_STAGE3_CANDIDATES,
      candidateCount: RES_0886_STAGE3_CANDIDATES.length,
      policy: RES_0886_STAGE3_POLICY,
    },
    authority: 'reference_only',
    operationalMutationExecuted: false,
    persistence: 'regulatory_installation_context_v2',
  });
}
