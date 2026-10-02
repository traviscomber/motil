export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type JsonObject = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const workOrderId = request.nextUrl.searchParams.get('workOrderId')?.trim();
    let pipelineQuery = context.supabase
      .from('operational_procurement_pipeline')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('required_date', { ascending: true, nullsFirst: false });
    if (workOrderId) pipelineQuery = pipelineQuery.eq('work_order_id', workOrderId);
    const { data: pipeline, error: pipelineError } = await pipelineQuery;
    if (pipelineError) {
      console.error('[procurement/operational-pipeline:view]', pipelineError);
      return NextResponse.json({ pipeline: [], requestLines: [], orderLines: [], invoiceMatchSummary: [], invoiceMatchLines: [], invoices: [], invoiceExceptions: [], canEdit: access.canWrite, unavailable: true });
    }

    const requestIds = (pipeline || []).map((row) => row.intake_request_id).filter(Boolean);
    const orderIds = (pipeline || []).map((row) => row.order_id).filter(Boolean);
    const workOrderIds = (pipeline || []).map((row) => row.work_order_id).filter(Boolean);
    const [
      { data: requestLines, error: requestLinesError },
      { data: requestPolicies, error: requestPoliciesError },
      { data: requestQuotations, error: requestQuotationsError },
      { data: orderLines, error: orderLinesError },
      { data: workOrders, error: workOrdersError },
      { data: invoiceMatchSummary, error: invoiceSummaryError },
      { data: invoiceMatchLines, error: invoiceLinesError },
      { data: invoices, error: invoicesError },
    ] = await Promise.all([
      requestIds.length ? context.supabase.from('procurement_intake_request_lines').select('*').in('intake_request_id', requestIds) : Promise.resolve({ data: [], error: null }),
      requestIds.length ? context.supabase.from('procurement_intake_requests').select('id,required_supplier_quotes,quotation_exception_type,quotation_exception_reason,quotation_exception_approved_by,quotation_exception_approved_at').eq('organization_id', context.organizationId).in('id', requestIds) : Promise.resolve({ data: [], error: null }),
      requestIds.length ? context.supabase.from('procurement_intake_quotations').select('intake_request_id,supplier_id,status').eq('organization_id', context.organizationId).in('intake_request_id', requestIds).in('status', ['received', 'awarded']) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_operational_order_lines').select('*').in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
      workOrderIds.length ? context.supabase.from('maintenance_work_orders').select('id,cost_center_id').in('id', workOrderIds).eq('organization_id', context.organizationId) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_three_way_match_summary_v1').select('*').eq('organization_id', context.organizationId).in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_three_way_match_lines_v1').select('*').eq('organization_id', context.organizationId).in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_supplier_invoices').select('id,organization_id,order_id,invoice_number,status,approved_for_payment_by,approved_for_payment_at,approval_basis,approval_notes,replaces_invoice_id,rejected_for_correction_by,rejected_for_correction_at,rejection_reason').eq('organization_id', context.organizationId).in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (requestLinesError) throw requestLinesError;
    if (requestPoliciesError) throw requestPoliciesError;
    if (requestQuotationsError) throw requestQuotationsError;
    if (orderLinesError) throw orderLinesError;
    if (workOrdersError) throw workOrdersError;
    if (invoiceSummaryError) throw invoiceSummaryError;
    if (invoiceLinesError) throw invoiceLinesError;
    if (invoicesError) throw invoicesError;

    const invoiceIds = (invoices || []).map((row) => row.id).filter(Boolean);
    const { data: invoiceExceptions, error: invoiceExceptionsError } = invoiceIds.length
      ? await context.supabase
          .from('procurement_match_exceptions')
          .select('id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status,resolution_notes,resolved_by,resolved_at,created_at')
          .eq('organization_id', context.organizationId)
          .in('invoice_id', invoiceIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null };
    if (invoiceExceptionsError) throw invoiceExceptionsError;

    const costCenterIds = (workOrders || []).map((row) => row.cost_center_id).filter(Boolean);
    const { data: costCenters, error: costCentersError } = costCenterIds.length
      ? await context.supabase.from('cost_centers').select('id,code,name,status').in('id', costCenterIds).eq('organization_id', context.organizationId)
      : { data: [], error: null };
    if (costCentersError) throw costCentersError;

    const workOrderById = new Map((workOrders || []).map((row) => [row.id, row]));
    const costCenterById = new Map((costCenters || []).map((row) => [row.id, row]));
    const requestPolicyById = new Map((requestPolicies || []).map((row) => [row.id, row]));
    const supplierIdsByRequest = new Map<string, Set<string>>();
    for (const quotation of requestQuotations || []) {
      if (!quotation.supplier_id) continue;
      const suppliers = supplierIdsByRequest.get(quotation.intake_request_id) || new Set<string>();
      suppliers.add(quotation.supplier_id);
      supplierIdsByRequest.set(quotation.intake_request_id, suppliers);
    }
    const pipelineWithFinance = (pipeline || []).map((row) => {
      const workOrder = row.work_order_id ? workOrderById.get(row.work_order_id) : null;
      const costCenter = workOrder?.cost_center_id ? costCenterById.get(workOrder.cost_center_id) : null;
      const ready = !row.work_order_id || Boolean(costCenter && !['inactive', 'disabled', 'closed'].includes(String(costCenter.status || 'active')));
      const policy = requestPolicyById.get(row.intake_request_id);
      const requiredSupplierQuotes = Math.max(1, Number(policy?.required_supplier_quotes || 3));
      const distinctSupplierCount = supplierIdsByRequest.get(row.intake_request_id)?.size || 0;
      const hasApprovedException = Boolean(policy?.quotation_exception_type && policy?.quotation_exception_reason && policy?.quotation_exception_approved_by && policy?.quotation_exception_approved_at);
      return {
        ...row,
        finance_ready: ready,
        finance_blocker: ready ? null : 'Asigne un centro de costo válido a la OT antes de adjudicar',
        cost_center_id: costCenter?.id || null,
        cost_center_code: costCenter?.code || null,
        cost_center_name: costCenter?.name || null,
        required_supplier_quotes: requiredSupplierQuotes,
        distinct_supplier_count: distinctSupplierCount,
        award_policy_satisfied: distinctSupplierCount >= requiredSupplierQuotes || hasApprovedException,
      };
    });

    return NextResponse.json({
      pipeline: pipelineWithFinance,
      requestLines: requestLines || [],
      orderLines: orderLines || [],
      invoiceMatchSummary: invoiceMatchSummary || [],
      invoiceMatchLines: invoiceMatchLines || [],
      invoices: invoices || [],
      invoiceExceptions: invoiceExceptions || [],
      canEdit: access.canWrite,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo cargar el pipeline operativo';
    console.error('[procurement/operational-pipeline]', error);
    return NextResponse.json({ pipeline: [], requestLines: [], orderLines: [], invoiceMatchSummary: [], invoiceMatchLines: [], invoices: [], invoiceExceptions: [], canEdit: access.canWrite, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as JsonObject;
    const action = String(body.action || '');
    if (action === 'create_quotation') {
      const { data, error } = await context.supabase.rpc('create_intake_quotation', { p_intake_request_id: body.intakeRequestId, p_supplier_id: body.supplierId, p_lead_time_days: body.leadTimeDays ?? null, p_payment_terms: body.paymentTerms ?? null, p_valid_until: body.validUntil ?? null, p_lines: body.lines });
      if (error) throw error;
      return NextResponse.json({ quotationId: data });
    }
    if (action === 'award_quotation') {
      const { data, error } = await context.supabase.rpc('award_intake_quotation', { p_quotation_id: body.quotationId });
      if (error) throw error;
      return NextResponse.json({ orderId: data });
    }
    if (action === 'receive_order') {
      const { data, error } = await context.supabase.rpc('receive_operational_order', { p_order_id: body.orderId, p_lines: body.lines, p_notes: body.notes ?? null });
      if (error) throw error;
      return NextResponse.json({ receiptId: data });
    }
    if (action === 'create_supplier_invoice') {
      const { data: rejected, error: rejectedError } = await context.supabase
        .from('procurement_supplier_invoices')
        .select('id,rejected_for_correction_at')
        .eq('organization_id', context.organizationId)
        .eq('order_id', body.orderId)
        .eq('status', 'rejected')
        .order('rejected_for_correction_at', { ascending: false, nullsFirst: false });
      if (rejectedError) throw rejectedError;

      const rejectedIds = (rejected || []).map((row) => row.id);
      const { data: replacements, error: replacementsError } = rejectedIds.length
        ? await context.supabase.from('procurement_supplier_invoices').select('replaces_invoice_id').eq('organization_id', context.organizationId).in('replaces_invoice_id', rejectedIds)
        : { data: [], error: null };
      if (replacementsError) throw replacementsError;

      const alreadyReplaced = new Set((replacements || []).map((row) => row.replaces_invoice_id).filter(Boolean));
      const pendingCorrections = (rejected || []).filter((row) => !alreadyReplaced.has(row.id));
      if (pendingCorrections.length > 1) {
        return NextResponse.json({ error: 'La OC tiene más de una factura rechazada pendiente de corrección; seleccione explícitamente cuál reemplazar.' }, { status: 409 });
      }

      const rpcName = pendingCorrections.length === 1 ? 'create_supplier_invoice_correction_v1' : 'create_supplier_invoice_v1';
      const rpcArgs = pendingCorrections.length === 1
        ? {
            p_replaces_invoice_id: pendingCorrections[0].id,
            p_invoice_number: body.invoiceNumber,
            p_invoice_date: body.invoiceDate,
            p_net_amount: body.netAmount,
            p_tax_amount: body.taxAmount,
            p_total_amount: body.totalAmount,
            p_lines: body.lines,
            p_document_url: body.documentUrl ?? null,
          }
        : {
            p_order_id: body.orderId,
            p_invoice_number: body.invoiceNumber,
            p_invoice_date: body.invoiceDate,
            p_net_amount: body.netAmount,
            p_tax_amount: body.taxAmount,
            p_total_amount: body.totalAmount,
            p_lines: body.lines,
            p_document_url: body.documentUrl ?? null,
          };

      const { data, error } = await context.supabase.rpc(rpcName, rpcArgs);
      if (error) throw error;
      const { data: matchStatus, error: matchError } = await context.supabase.rpc('refresh_supplier_invoice_match_v1', { p_invoice_id: data });
      if (matchError) throw matchError;
      return NextResponse.json({ invoiceId: data, matchStatus, correctionOfInvoiceId: pendingCorrections[0]?.id ?? null });
    }
    if (action === 'refresh_supplier_invoice_match') {
      const { data, error } = await context.supabase.rpc('refresh_supplier_invoice_match_v1', { p_invoice_id: body.invoiceId });
      if (error) throw error;
      return NextResponse.json({ matchStatus: data });
    }
    if (action === 'resolve_supplier_invoice_exception') {
      const { error } = await context.supabase.rpc('resolve_procurement_match_exception_v1', {
        p_exception_id: body.exceptionId,
        p_decision: body.decision,
        p_notes: body.notes,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'approve_supplier_invoice_payment') {
      const { data, error } = await context.supabase.rpc('approve_supplier_invoice_for_payment_v1', {
        p_invoice_id: body.invoiceId,
        p_notes: body.notes ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      return NextResponse.json({ approvalBasis: data });
    }
    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo completar la operación';
    const fallbackStatus = message.startsWith('Imputación contable') ? 409 : 500;
    const status = message.startsWith('Política de cotizaciones') ? 409 : fallbackStatus;
    return NextResponse.json({ error: message }, { status });
  }
}
