export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from('contracts')
    .select('id,contract_number,title,contract_type,status,contract_value,currency,paid_amount,execution_percentage,responsible_area,responsible_person,end_date,review_due_date,contractor_name,property_name,project_name,royalty_rate,guarantee_amount,compliance_status,compliance_notes,file_url,updated_at')
    .eq('organization_id', context.organizationId)
    .or('property_name.not.is.null,royalty_rate.gt.0')
    .order('review_due_date', { ascending: true, nullsFirst: false })
    .order('end_date', { ascending: true, nullsFirst: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const items = rows.map((row) => ({
    ...row,
    has_evidence: Boolean(row.file_url),
    pending_amount: Math.max(Number(row.contract_value || 0) - Number(row.paid_amount || 0), 0),
  }));

  return NextResponse.json({
    data: items,
    accessLevel: access,
    summary: {
      total: items.length,
      with_property: items.filter((item) => Boolean(item.property_name)).length,
      with_royalty: items.filter((item) => Number(item.royalty_rate || 0) > 0).length,
      review_due: items.filter((item) => Boolean(item.review_due_date)).length,
      missing_evidence: items.filter((item) => !item.has_evidence).length,
    },
  });
}
