export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

type SettlementRow = {
  id: string;
  settlement_number: string;
  settlement_date: string;
  contract_id: string | null;
  settlement_document_id: string | null;
  currency: string;
  gross_amount: number | null;
  deductions_amount: number | null;
  net_amount: number | null;
  due_date: string | null;
  status: string;
  payable_id: string | null;
  payment_request_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ShipmentRow = {
  id: string;
  shipment_date: string | null;
  shipment_number: string | null;
  destination: string | null;
  carrier_name_raw: string | null;
  vehicle_plate_raw: string | null;
  normalized_metric_tons: number | null;
  normalization_status?: string | null;
  validation_status: string | null;
};

type ContractRow = {
  id: string;
  contract_number: string | null;
  title: string | null;
  contractor_name: string | null;
  status?: string | null;
};

type DocumentRow = {
  id: string;
  document_name: string;
  document_code: string | null;
  status: string | null;
  canonical_role?: string | null;
  provenance_status?: string | null;
  file_url?: string | null;
};

type PaymentRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  executed_at: string | null;
  bank_reference: string | null;
  evidence_document_id: string | null;
};

type SettlementShipmentRow = {
  settlement_id: string;
  shipment_id: string;
  settled_metric_tons: number | null;
};

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

  const settlementsResult = await auth.context.supabase
    .from('mineral_settlements')
    .select('id,settlement_number,settlement_date,contract_id,settlement_document_id,currency,gross_amount,deductions_amount,net_amount,due_date,status,payable_id,payment_request_id,notes,created_at,updated_at')
    .eq('organization_id', auth.context.organizationId)
    .order('settlement_date', { ascending: false })
    .limit(500);

  const [shipmentsResult, contractsResult, documentsResult] = await Promise.all([
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
        shipmentOptions: (shipmentsResult.data || []) as ShipmentRow[],
        contractOptions: (contractsResult.data || []) as ContractRow[],
        documentOptions: (documentsResult.data || []) as DocumentRow[],
        accessLevel: auth.access,
        schemaReady: false,
        summary: { total: 0, submitted: 0, approved: 0, paid: 0, without_document: 0 },
      });
    }
    return NextResponse.json({ error: settlementsResult.error.message }, { status: 500 });
  }

  const rows = (settlementsResult.data || []) as SettlementRow[];
  const settlementIds = rows.map((row) => row.id);
  const contractIds = rows.flatMap((row) => row.contract_id ? [row.contract_id] : []);
  const documentIds = rows.flatMap((row) => row.settlement_document_id ? [row.settlement_document_id] : []);
  const paymentRequestIds = rows.flatMap((row) => row.payment_request_id ? [row.payment_request_id] : []);

  let links: SettlementShipmentRow[] = [];
  let selectedContracts: ContractRow[] = [];
  let selectedDocuments: DocumentRow[] = [];
  let paymentRequests: PaymentRow[] = [];

  if (settlementIds.length) {
    const result = await auth.context.supabase
      .from('mineral_settlement_shipments')
      .select('settlement_id,shipment_id,settled_metric_tons')
      .eq('organization_id', auth.context.organizationId)
      .in('settlement_id', settlementIds);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    links = (result.data || []) as SettlementShipmentRow[];
  }

  if (contractIds.length) {
    const result = await auth.context.supabase
      .from('contracts')
      .select('id,contract_number,title,contractor_name')
      .eq('organization_id', auth.context.organizationId)
      .in('id', Array.from(new Set(contractIds)));
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    selectedContracts = (result.data || []) as ContractRow[];
  }

  if (documentIds.length) {
    const result = await auth.context.supabase
      .from('module_documents')
      .select('id,document_name,document_code,status,file_url')
      .eq('organization_id', auth.context.organizationId)
      .in('id', Array.from(new Set(documentIds)));
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    selectedDocuments = (result.data || []) as DocumentRow[];
  }

  if (paymentRequestIds.length) {
    const result = await auth.context.supabase
      .from('finance_payment_requests')
      .select('id,status,amount,currency,executed_at,bank_reference,evidence_document_id')
      .eq('organization_id', auth.context.organizationId)
      .in('id', Array.from(new Set(paymentRequestIds)));
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    paymentRequests = (result.data || []) as PaymentRow[];
  }

  const shipmentIds = Array.from(new Set(links.map((row) => row.shipment_id)));
  let selectedShipments: ShipmentRow[] = [];

  if (shipmentIds.length) {
    const result = await auth.context.supabase
      .from('production_concentrate_shipments')
      .select('id,shipment_date,shipment_number,destination,carrier_name_raw,vehicle_plate_raw,normalized_metric_tons,validation_status')
      .eq('organization_id', auth.context.organizationId)
      .in('id', shipmentIds);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    selectedShipments = (result.data || []) as ShipmentRow[];
  }

  const contractsById = new Map<string, ContractRow>(selectedContracts.map((row) => [row.id, row]));
  const documentsById = new Map<string, DocumentRow>(selectedDocuments.map((row) => [row.id, row]));
  const paymentsById = new Map<string, PaymentRow>(paymentRequests.map((row) => [row.id, row]));
  const shipmentsById = new Map<string, ShipmentRow>(selectedShipments.map((row) => [row.id, row]));
  const linksBySettlement = new Map<string, Array<SettlementShipmentRow & { shipment: ShipmentRow | null }>>();

  for (const link of links) {
    const list = linksBySettlement.get(link.settlement_id) || [];
    list.push({
      ...link,
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
    shipmentOptions: (shipmentsResult.data || []) as ShipmentRow[],
    contractOptions: (contractsResult.data || []) as ContractRow[],
    documentOptions: (documentsResult.data || []) as DocumentRow[],
    accessLevel: auth.access,
    schemaReady: true,
    summary: {
      total: data.length,
      submitted: data.filter((item) => item.status === 'submitted').length,
      approved: data.filter((item) => item.status === 'approved').length,
      paid: data.filter((item) => item.status === 'paid' || Boolean(item.payment?.executed_at)).length,
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
  const shipmentIds: string[] = Array.isArray(body.shipment_ids)
    ? Array.from(new Set<string>(body.shipment_ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)))
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
    .insert(shipmentIds.map((shipmentId) => ({
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
