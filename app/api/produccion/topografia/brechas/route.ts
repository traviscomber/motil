export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { requireModuleAccess, MODULE_KEYS } from '@/lib/api/module-access';
import { buildTopographyEvidenceSnapshot } from '@/lib/production/topography-evidence-queue.mjs';

const headers = { 'Cache-Control':'private, no-store' };
const RECORD_LIMIT=200;

// Auth + capability + organization filter are mandatory: the server client has service credentials.
export async function GET(request:NextRequest){
  const access=await requireModuleAccess(request,MODULE_KEYS.PROD_TOPOGRAFIA);
  if(!access.authorized)return access.response;
  const context=await getOrganizationContext(request);
  if(!context.ok)return context.response;

  const {data,count,error}=await context.supabase
    .from('production_geology_topography_source_gap_2026_v1')
    .select('drill_hole_id,hole_code,orientation_state,recovery_priority,source_rows,source_report_ids,source_gap_class,required_source_action,audit_scope',{count:'exact'})
    .eq('organization_id',context.organizationId)
    .order('recovery_priority',{ascending:true})
    .order('hole_code',{ascending:true})
    .limit(RECORD_LIMIT);

  if(error)return NextResponse.json(
    {error:'No se pudo consultar la auditoría documental de Topografía.'},
    {status:503,headers},
  );
  // Count and duplicate anomalies are explicit. This route never mutates source records.
  return NextResponse.json(buildTopographyEvidenceSnapshot(data||[],count),{headers});
}
