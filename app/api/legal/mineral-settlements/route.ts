export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

async function authorize(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return { ok: false as const, response: context.response };

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.LEGAL_MODULO);
  if (access !== 'ED' && access !== 'LEC') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'No tienes acceso al módulo Legal' }, { status: 403 }),
    };
  }

  return { ok: true as const, context, access };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  const [settlementsResult, shipmentsResult, contractsResult, documentsResult] = await Promise.all([
    auth.context.supabase
      .from('mineral_settlements')
      .select('id,settlement_number,settlement_date,contract_id,settlement_document_id,currency,gross_amount,deductions_amount,net_amount,due_date,status,payable_id,payment_request_id,notes,created_at,updated_at')
      .eq('organization_id', auth.context.organizationId)
      .order('settlement_date', { ascending: false })
      .limit(500),
    auth.context.supabase
      .from('production_concentrate_shipments')
      .select('id,shipment_date,shipment_number,destination,carrier_name_raw,vehicle_plate_raw,normalized_metric_tons,normalization_status,validation_status')
      .eq('organization_id', auth.context.organizationId)
      .order('shipment_date', { ascending: false })
      .limit(250),
    auth.context.supabase
      .from('contracts')
      .select('id,contract_number,title,contractor_name,status')
      .eq('organization_id', auth.context.organizationId)
      .order('created_at', { ascending: false })
      .limit(200),
    auth.context.supabase
      .from('module_documents')
      .select('id,document_name,document_code,status,canonical_role,provenance_status')
      .eq('organization_id', auth.context.organizationId)
      .eq('module', 'legal')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })
      .limit(100),
  ]);

  if (settlementsResult.error) {
    if (settlementsResult.error.code === '42P01') {
      return NextResponse.json({
        data: [],
        shipmentOptions: shipmentsResult.data || [],
        contractOptions: contractsResult.data || [],
        documentOptions: documentsResult.data || [],
        accessLevel: auth.access,
        schemaReady: false,
        summary: { total: 0, submitted: 0, approved: 0, paid: 0, without_document: 0 },
      });
    }
    return NextResponse.json({ error: settlementsResult.error.message }, { status: 500 });
  }

  const rows = settlementsResult.data || [];
  const settlementIds = rows.map((row) => row.id);
  const contractIds = Array.from(new Set(rows.map((row) => row.contract_id).filter(Boolean)));
  const documentIds = Array.from(new Set(rows.map((row) => row.settlement_document_id).filter(Boolean)));
  const paymentRequestIds = Array.from(new Set(rows.map((row) => row.payment_request_id).filter(Boolean)));

  const [linksResult, selectedContractsResult, selectedDocumentsResult, paymentRequestsResult] = await Promise.all([
    settlementIds.length
      ? auth.context.supabase
          .from('mineral_settlement_shipments')
          .select('settlement_id,shipment_id,settled_metric_tons')
          .eq('organization_id', auth.context.organizationId)
          .in('settlement_id', settlementIds)
      : Promise.resolve({ data: [], error: null }),
    contractIds.length
      ? auth.context.supabase
          .from('contracts')
          .select('id,contract_number,title,contractor_name')
          .eq('organization_id', auth.context.organizationId)
          .in('id', contractIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? auth.context.supabase
          .from('module_documents')
          .select('id,document_name,document_code,status,file_url')
          .eq('organization_id', auth.context.organizationId)
          .in('id', documentIds)
      : Promise.resolve({ data: [], error: null }),
    paymentRequestIds.length
      ? auth.context.supabase
          .from('finance_payment_requests')
          .select('id,status,amount,currency,executed_at,bank_reference,evidence_document_id')
          .eq('organization_id', auth.context.organizationId)
          .in('id', paymentRequestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const shipmentIds = Array.from(new Set((linksResult.data || []).map((row) => row.shipment_id).filter(Boolean)));
  const selectedShipmentsResult = shipmentIds.length
    ? await auth.context.supabase
        .from('production_concentrate_shipments')
        .select('id,shipment_date,shipment_number,destination,carrier_name_raw,vehicle_plate_raw,normalized_metric_tons,validation_status')
        .eq('organization_id', auth.context.organizationId)
        .in('id', shipmentIds)
    : { data: [], error: null };

  const contractsById = new Map((selectedContractsResult.data || []).map((row) => [row.id, row]));
  const documentsById = new Map((selectedDocumentsResult.data || []).map((row) => [row.id, row]));
  const paymentsById = new Map((paymentRequestsResult.data || []).map((row) => [row.id, row]));
  const shipmentsById = new Map((selectedShipmentsResult.data || []).map((row) => [row.id, row]));

  type ShipmentLink = {
    settlement_id: string;
    shipment_id: string;
    settled_metric_tons: number | null;
    shipment: {
      id: string;
      shipment_date: string | null;
      shipment_number: string | null;
      destination: string | null;
      carrier_name_raw: string | null;
      vehicle_plate_raw: string | null;
      normalized_metric_tons: number | null;
      validation_status: string | null;
    } | null;
  };

  const linksBySettlement = new Map<string, ShipmentLink[]>();
  for (const link of linksResult.data || []) {
    const list = linksBySettlement.get(link.settlement_id) || [];
    list.push({
      settlement_id: String(link.settlement_id),
      shipment_id: String(link.shipment_id),
      settled_metric_tons: link.settled_metric_tons === null ? null : Number(link.settled_metric_tons),
      shipment: shipmentsById.get(link.shipment_id) || null,
    });
    linksBySettlement.set(link.settlement_id, list);
  }

  const data = rows.map((row) => ({
    ...row,
    contract: row.contract_id ? contractsById.get(row.contract_id) || null : null,
    document: row.settlement_document_id ? documentsById.get(row.settlement_document_id) || null : null,
    payment: row.payment_request_id ? paymentsById.get(row.payment_request_id) || null : null,
    shipments: linksBySettlement.get(row.id) || [],
  }));

  return NextResponse.json({
    data,
    shipmentOptions: shipmentsResult.data || [],
    contractOptions: contractsResult.data || [],
    documentOptions: documentsResult.data || [],
    accessLevel: auth.access,
    schemaReady: true,
    summary: {
      total: data.length,
      submitted: data.filter((item) => item.status === 'submitted').length,
      approved: data.filter((item) => item.status === 'approved').length,
      paid: data.filter((item) => item.status === 'paid' || Boolean(item.payment && item.payment.executed_at)).length,
      without_document: data.filter((item) => !item.settlement_document_id).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  if (auth.access !== 'ED') {
    return NextResponse.json({ error: 'Legal está en modo solo lectura para tu cargo' }, { status: 403 });
  }

  const body = await request.json();
  const settlementNumber = String(body.settlement_number || '').trim();
  const settlementDate = String(body.settlement_date || '').trim();
  const shipmentIds = Array.isArray(body.shipment_ids)
    ? Array.from(new Set(body.shipment_ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)))
    : [];

  if (!settlementNumber) return NextResponse.json({ error: 'settlement_number requerido' }, { status: 400 });
  if (!settlementDate) return NextResponse.json({ error: 'settlement_date requerido' }, { status: 400 });
  if (!shipmentIds.length) return NextResponse.json({ error: 'Selecciona al menos un embarque' }, { status: 400 });

  const { data: shipments, error: shipmentsError } = await auth.context.supabase
    .from('production_concentrate_shipments')
    .select('id')
    .eq('organization_id', auth.context.organizationId)
    .in('id', shipmentIds);

  if (shipmentsError) return NextResponse.json({ error: shipmentsError.message }, { status: 500 });
  if ((shipments || []).length !== shipmentIds.length) {
    return NextResponse.json({ error: 'Uno o más embarques no pertenecen a la organización' }, { status: 400 });
  }

  const contractId = String(body.contract_id || '').trim() || null;
  if (contractId) {
    const { data: contract, error: contractError } = await auth.context.supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .eq('organization_id', auth.context.organizationId)
      .maybeSingle();
    if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 });
    if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
  }

  const settlementDocumentId = String(body.settlement_document_id || '').trim() || null;
  if (settlementDocumentId) {
    const { data: document, error: documentError } = await auth.context.supabase
      .from('module_documents')
      .select('id')
      .eq('id', settlementDocumentId)
      .eq('organization_id', auth.context.organizationId)
      .eq('is_active', true)
      .maybeSingle();
    if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 });
    if (!document) return NextResponse.json({ error: 'Documento de liquidación no encontrado' }, { status: 404 });
  }

  const grossAmount = body.gross_amount === null || body.gross_amount === undefined || body.gross_amount === ''
    ? null
    : Number(body.gross_amount);
  const deductionsAmount = body.deductions_amount === null || body.deductions_amount === undefined || body.deductions_amount === ''
    ? null
    : Number(body.deductions_amount);
  const netAmount = body.net_amount === null || body.net_amount === undefined || body.net_amount === ''
    ? null
    : Number(body.net_amount);

  for (const value of [grossAmount, deductionsAmount, netAmount]) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: 'Los montos deben ser valores positivos' }, { status: 400 });
    }
  }

  const { data: settlement, error: settlementError } = await auth.context.supabase
    .from('mineral_settlements')
    .insert({
      organization_id: auth.context.organizationId,
      settlement_number: settlementNumber,
      settlement_date: settlementDate,
      contract_id: contractId,
      settlement_document_id: settlementDocumentId,
      currency: String(body.currency || 'CLP').trim() || 'CLP',
      gross_amount: grossAmount,
      deductions_amount: deductionsAmount,
      net_amount: netAmount,
      due_date: body.due_date || null,
      status: settlementDocumentId ? 'submitted' : 'draft',
      notes: String(body.notes || '').trim() || null,
      created_by: auth.context.userId,
    })
    .select('*')
    .single();

  if (settlementError) return NextResponse.json({ error: settlementError.message }, { status: 500 });

  const { error: linksError } = await auth.context.supabase
    .from('mineral_settlement_shipments')
    .insert(shipmentIds.map((shipmentId: string) => ({
      organization_id: auth.context.organizationId,
      settlement_id: settlement.id,
      shipment_id: shipmentId,
    })));

  if (linksError) {
    await auth.context.supabase
      .from('mineral_settlements')
      .delete()
      .eq('id', settlement.id)
      .eq('organization_id', auth.context.organizationId);
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  return NextResponse.json({ data: settlement }, { status: 201 });
}
