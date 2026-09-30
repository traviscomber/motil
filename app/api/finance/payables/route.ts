export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [
    { data: payables, error: payablesError },
    { data: payments, error: paymentsError },
    { data: requests, error: requestsError },
    { data: signatures, error: signaturesError },
  ] = await Promise.all([
    context.supabase
      .from('procurement_accounts_payable_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('due_date', { ascending: true, nullsFirst: true }),
    context.supabase
      .from('procurement_supplier_payments')
      .select('id,organization_id,payable_id,amount,currency,payment_date,payment_reference,notes,recorded_at,reconciled_at,reconciliation_reference,reconciliation_notes')
      .eq('organization_id', context.organizationId)
      .order('payment_date', { ascending: false }),
    context.supabase
      .from('finance_payment_requests')
      .select('id,organization_id,payable_id,amount,currency,requested_payment_date,status,required_signatures,request_note,created_by,created_at,executed_payment_id,executed_by,executed_at,bank_reference,evidence_document_id')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false }),
    context.supabase
      .from('finance_payment_request_signatures')
      .select('id,request_id,signer_id,decision,note,signed_at')
      .eq('organization_id', context.organizationId)
      .order('signed_at', { ascending: true }),
  ]);

  if (payablesError || paymentsError || requestsError || signaturesError) {
    console.error('[finance/payables]', payablesError || paymentsError || requestsError || signaturesError);
    return NextResponse.json(
      { payables: [], payments: [], paymentRequests: [], signatures: [], canEdit: access.canWrite, error: 'No se pudo cargar cuentas por pagar' },
      { status: 500 },
    );
  }

  const signaturesByRequest = new Map<string, number>();
  for (const row of signatures || []) {
    if (row.decision !== 'approved') continue;
    signaturesByRequest.set(row.request_id, (signaturesByRequest.get(row.request_id) || 0) + 1);
  }

  const hydratedRequests = (requests || []).map((row) => ({
    ...row,
    signature_count: signaturesByRequest.get(row.id) || 0,
    signed_by_me: (signatures || []).some((signature) => signature.request_id === row.id && signature.signer_id === context.userId && signature.decision === 'approved'),
  }));

  return NextResponse.json({
    payables: payables || [],
    payments: payments || [],
    paymentRequests: hydratedRequests,
    signatures: signatures || [],
    canEdit: access.canWrite,
    currentUserId: context.userId,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'set_due_date') {
      const { error } = await context.supabase.rpc('set_supplier_payable_due_date_v2', {
        p_organization_id: context.organizationId,
        p_payable_id: body.payableId,
        p_due_date: body.dueDate,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'create_payment_request') {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Monto de transferencia inválido' }, { status: 400 });
      }

      const { data: payable, error: payableError } = await context.supabase
        .from('procurement_accounts_payable_v1')
        .select('id,currency,outstanding_amount,due_date,status')
        .eq('organization_id', context.organizationId)
        .eq('id', body.payableId)
        .maybeSingle();

      if (payableError) throw payableError;
      if (!payable) return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 });
      if (!payable.due_date) return NextResponse.json({ error: 'Defina vencimiento antes de solicitar transferencia' }, { status: 409 });
      if (amount > Number(payable.outstanding_amount || 0) + 0.0001) {
        return NextResponse.json({ error: 'La transferencia no puede superar el saldo pendiente' }, { status: 409 });
      }

      const { data: existing } = await context.supabase
        .from('finance_payment_requests')
        .select('id,status')
        .eq('organization_id', context.organizationId)
        .eq('payable_id', payable.id)
        .in('status', ['pending_signatures', 'approved'])
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Ya existe una solicitud de transferencia abierta para esta factura', requestId: existing.id }, { status: 409 });
      }

      const { data: created, error } = await context.supabase
        .from('finance_payment_requests')
        .insert({
          organization_id: context.organizationId,
          payable_id: payable.id,
          amount,
          currency: payable.currency || 'CLP',
          requested_payment_date: body.paymentDate || null,
          required_signatures: 2,
          request_note: String(body.notes || '').trim() || null,
          created_by: context.userId,
          status: 'pending_signatures',
        })
        .select('id')
        .single();

      if (error) throw error;
      return NextResponse.json({ requestId: created.id });
    }

    if (action === 'sign_payment_request') {
      const requestId = String(body.requestId || '').trim();
      const { data: paymentRequest, error: requestError } = await context.supabase
        .from('finance_payment_requests')
        .select('id,status,required_signatures')
        .eq('organization_id', context.organizationId)
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!paymentRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
      if (!['pending_signatures', 'approved'].includes(paymentRequest.status)) {
        return NextResponse.json({ error: 'La solicitud ya no admite firmas' }, { status: 409 });
      }

      const { error: signatureError } = await context.supabase
        .from('finance_payment_request_signatures')
        .insert({
          organization_id: context.organizationId,
          request_id: requestId,
          signer_id: context.userId,
          decision: 'approved',
          note: String(body.note || '').trim() || null,
        });

      if (signatureError) {
        if (signatureError.code === '23505') {
          return NextResponse.json({ error: 'Ya firmaste esta solicitud' }, { status: 409 });
        }
        throw signatureError;
      }

      const { count, error: countError } = await context.supabase
        .from('finance_payment_request_signatures')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', context.organizationId)
        .eq('request_id', requestId)
        .eq('decision', 'approved');

      if (countError) throw countError;
      if ((count || 0) >= Number(paymentRequest.required_signatures || 2)) {
        const { error: approveError } = await context.supabase
          .from('finance_payment_requests')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('organization_id', context.organizationId)
          .eq('id', requestId)
          .eq('status', 'pending_signatures');
        if (approveError) throw approveError;
      }

      return NextResponse.json({ ok: true, signatureCount: count || 0 });
    }

    if (action === 'execute_payment_request') {
      const requestId = String(body.requestId || '').trim();
      const bankReference = String(body.reference || '').trim();
      const evidenceDocumentId = String(body.evidenceDocumentId || '').trim();
      const paymentDate = String(body.paymentDate || '').trim();

      if (!bankReference) return NextResponse.json({ error: 'La transferencia requiere referencia bancaria' }, { status: 400 });
      if (!evidenceDocumentId) return NextResponse.json({ error: 'Adjunta el comprobante de transferencia' }, { status: 400 });
      if (!paymentDate) return NextResponse.json({ error: 'Ingresa la fecha real de la transferencia' }, { status: 400 });

      const { data: paymentRequest, error: requestError } = await context.supabase
        .from('finance_payment_requests')
        .select('id,payable_id,amount,status,required_signatures,executed_payment_id')
        .eq('organization_id', context.organizationId)
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!paymentRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
      if (paymentRequest.executed_payment_id || paymentRequest.status === 'executed') {
        return NextResponse.json({ error: 'La transferencia ya fue registrada' }, { status: 409 });
      }

      const [{ count: signatureCount, error: signatureError }, { data: evidence, error: evidenceError }] = await Promise.all([
        context.supabase
          .from('finance_payment_request_signatures')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', context.organizationId)
          .eq('request_id', requestId)
          .eq('decision', 'approved'),
        context.supabase
          .from('module_documents')
          .select('id,module,category')
          .eq('organization_id', context.organizationId)
          .eq('id', evidenceDocumentId)
          .maybeSingle(),
      ]);

      if (signatureError) throw signatureError;
      if (evidenceError) throw evidenceError;
      if ((signatureCount || 0) < Number(paymentRequest.required_signatures || 2)) {
        return NextResponse.json({ error: 'Se requieren dos firmas distintas antes de ejecutar la transferencia' }, { status: 409 });
      }
      if (!evidence || evidence.module !== 'finanzas') {
        return NextResponse.json({ error: 'El comprobante no pertenece a Finanzas' }, { status: 409 });
      }

      const { data: paymentId, error: paymentError } = await context.supabase.rpc('record_supplier_payment_v2', {
        p_organization_id: context.organizationId,
        p_payable_id: paymentRequest.payable_id,
        p_amount: paymentRequest.amount,
        p_payment_date: paymentDate,
        p_reference: bankReference,
        p_notes: String(body.notes || '').trim() || null,
      });
      if (paymentError) throw paymentError;

      const { error: updateError } = await context.supabase
        .from('finance_payment_requests')
        .update({
          status: 'executed',
          executed_payment_id: paymentId,
          executed_by: context.userId,
          executed_at: new Date().toISOString(),
          bank_reference: bankReference,
          evidence_document_id: evidenceDocumentId,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', context.organizationId)
        .eq('id', requestId)
        .in('status', ['pending_signatures', 'approved']);

      if (updateError) throw updateError;
      return NextResponse.json({ paymentId });
    }

    if (action === 'reconcile_payment') {
      const { error } = await context.supabase.rpc('reconcile_supplier_payment_v2', {
        p_organization_id: context.organizationId,
        p_payment_id: body.paymentId,
        p_reference: body.reference,
        p_notes: body.notes ?? null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'record_payment') {
      return NextResponse.json({ error: 'Los pagos ahora requieren solicitud de transferencia y dos firmas' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : 'No se pudo completar la operación';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
