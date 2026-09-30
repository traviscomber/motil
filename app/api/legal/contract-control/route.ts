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
    .select('id,contract_number,title,contract_type,status,contract_value,currency,paid_amount,execution_percentage,responsible_area,responsible_person,contractor_name,property_name,project_name,review_due_date,end_date,compliance_status,compliance_notes,file_url,updated_at')
    .eq('organization_id', context.organizationId)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || []).map((row) => {
    const contractValue = Number(row.contract_value || 0);
    const paidAmount = Number(row.paid_amount || 0);
    const executionPercentage = row.execution_percentage === null || row.execution_percentage === undefined
      ? null
      : Number(row.execution_percentage);
    const paidPercentage = contractValue > 0 ? (paidAmount / contractValue) * 100 : null;
    const deltaPercentagePoints =
      paidPercentage !== null && executionPercentage !== null
        ? paidPercentage - executionPercentage
        : null;

    const attentionReason =
      deltaPercentagePoints !== null && deltaPercentagePoints > 0
        ? 'El porcentaje pagado supera el avance físico informado.'
        : executionPercentage === null
          ? 'No existe avance físico informado.'
          : !row.file_url
            ? 'No hay respaldo documental visible.'
            : null;

    return {
      id: row.id,
      contract_number: row.contract_number,
      title: row.title,
      contract_type: row.contract_type,
      status: row.status,
      contractor_name: row.contractor_name,
      property_name: row.property_name,
      project_name: row.project_name,
      responsible_area: row.responsible_area,
      responsible_person: row.responsible_person,
      contract_value: contractValue,
      currency: row.currency || 'CLP',
      paid_amount: paidAmount,
      paid_percentage: paidPercentage,
      execution_percentage: executionPercentage,
      delta_percentage_points: deltaPercentagePoints,
      review_due_date: row.review_due_date,
      end_date: row.end_date,
      compliance_status: row.compliance_status,
      compliance_notes: row.compliance_notes,
      has_evidence: Boolean(row.file_url),
      attention_reason: attentionReason,
      updated_at: row.updated_at,
    };
  });

  return NextResponse.json({
    data: items,
    accessLevel: access,
    summary: {
      total: items.length,
      without_execution: items.filter((item) => item.execution_percentage === null).length,
      payment_ahead_of_execution: items.filter((item) => (item.delta_percentage_points || 0) > 0).length,
      without_evidence: items.filter((item) => !item.has_evidence).length,
      with_attention: items.filter((item) => Boolean(item.attention_reason)).length,
    },
    policy: {
      comparison: 'Pago % = monto pagado / valor contractual. La diferencia se muestra en puntos porcentuales frente al avance físico informado.',
      interpretation: 'Que el pago supere el avance no se declara incumplimiento automáticamente; se presenta como señal para revisión.',
      evidence: 'La ausencia de archivo contractual visible se muestra como falta de respaldo, no como inexistencia jurídica.',
    },
  });
}
