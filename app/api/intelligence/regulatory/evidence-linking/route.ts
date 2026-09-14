export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  REGULATORY_EVIDENCE_LINK_POLICY,
  REGULATORY_EVIDENCE_STATUSES,
} from '@/lib/intelligence/regulatory-evidence-link';

export async function GET() {
  return NextResponse.json({
    statuses: REGULATORY_EVIDENCE_STATUSES,
    policy: REGULATORY_EVIDENCE_LINK_POLICY,
    authority: 'advisory_reference_only',
    operationalMutationExecuted: false,
    persistence: 'regulatory_evidence_linking_contract_v1',
  });
}
