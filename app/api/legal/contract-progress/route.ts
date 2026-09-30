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

  const [contractOptionsResult, evidenceOptionsResult, ledgerResult] = await Promise.all([
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
    auth.context.supabase
      .from('contract_progress_updates')
      .select('id,contract_id,period_start,period_end,execution_percentage,progress_note,evidence_document_id,status,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,payment_request_id,created_at,updated_at')
      .eq('organization_id', auth.context.organizationId)
      .order('submitted_at', { ascending: false })
      .limit(500),
  ]);

  const contractOptions = contractOptionsResult.data || [];
  const evidenceOptions = evidenceOptionsResult.data || [];

  if (ledgerResult.error) {
    if (ledgerResult.error.code === '42P01') {
      return NextResponse.json({
        data: [],
        contracts: contractOptions,
        evidenceOptions,
        accessLevel: auth.access,
        schemaReady: false,
        summary: { total: 0, submitted: 0, approved: 0, rejected: 0, without_evidence: 0 },
      });
    }
    return NextResponse.json({ error: ledgerResult.error.message }, { status: 500 });
  }

  const rows = ledgerResult.data || [];
  const contractIds = Array.from(new Set(rows.map((row) => row.contract_id).filter(Boolean)));
  const documentIds = Array.from(new Set(rows.map((row) => row.evidence_document_id).filter(Boolean)));

  const [contractsResult, documentsResult] = await Promise.all([
    contractIds.length
      ? auth.context.supabase
          .from('contracts')
          .select('id,contract_number,title,contractor_name,contract_value,currency,paid_amount,execution_percentage')
          .eq('organization_id', auth.context.organizationId)
          .in('id', contractIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? auth.context.supabase
          .from('module_documents')
          .select('id,document_name,document_code,status,file_url,canonical_role,provenance_status')
          .eq('organization_id', auth.context.organizationId)
          .in('id', documentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const contractsById = new Map((contractsResult.data || []).map((row) => [row.id, row]));
  const documentsById = new Map((documentsResult.data || []).map((row) => [row.id, row]));

  const items = rows.map((row) => {
    const contract = contractsById.get(row.contract_id);
    const evidence = row.evidence_document_id ? documentsById.get(row.evidence_document_id) : null;
    const contractValue = Number(contract?.contract_value || 0);
    const paidAmount = Number(contract?.paid_amount || 0);
    const paidPercentage = contractValue > 0 ? (paidAmount / contractValue) * 100 : null;

    return {
      ...row,
      contract: contract ? {
        id: contract.id,
        contract_number: contract.contract_number,
        title: contract.title,
        contractor_name: contract.contractor_name,
        contract_value: contractValue,
        currency: contract.currency || 'CLP',
        paid_amount: paidAmount,
        paid_percentage: paidPercentage,
        current_execution_percentage: contract.execution_percentage === null
          ? null
          : Number(contract.execution_percentage),
      } : null,
      evidence: evidence ? {
        id: evidence.id,
        document_name: evidence.document_name,
        document_code: evidence.document_code,
        status: evidence.status,
        file_url: evidence.file_url,
        canonical_role: evidence.canonical_role,
        provenance_status: evidence.provenance_status,
      } : null,
    };
  });

  return NextResponse.json({
    data: items,
    contracts: contractOptions,
    evidenceOptions,
    accessLevel: auth.access,
    schemaReady: true,
    summary: {
      total: items.length,
      submitted: items.filter((item) => item.status === 'submitted').length,
      approved: items.filter((item) => item.status === 'approved').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
      without_evidence: items.filter((item) => !item.evidence_document_id).length,
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
  const contractId = String(body.contract_id || '').trim();
  const executionPercentage = Number(body.execution_percentage);

  if (!contractId) return NextResponse.json({ error: 'contract_id requerido' }, { status: 400 });
  if (!Number.isFinite(executionPercentage) || executionPercentage < 0 || executionPercentage > 100) {
    return NextResponse.json({ error: 'execution_percentage debe estar entre 0 y 100' }, { status: 400 });
  }

  const { data: contract, error: contractError } = await auth.context.supabase
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .eq('organization_id', auth.context.organizationId)
    .maybeSingle();

  if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 });
  if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });

  const evidenceDocumentId = String(body.evidence_document_id || '').trim() || null;
  if (evidenceDocumentId) {
    const { data: evidence, error: evidenceError } = await auth.context.supabase
      .from('module_documents')
      .select('id')
      .eq('id', evidenceDocumentId)
      .eq('organization_id', auth.context.organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (evidenceError) return NextResponse.json({ error: evidenceError.message }, { status: 500 });
    if (!evidence) return NextResponse.json({ error: 'Documento de evidencia no encontrado' }, { status: 404 });
  }

  const { data, error } = await auth.context.supabase
    .from('contract_progress_updates')
    .insert({
      organization_id: auth.context.organizationId,
      contract_id: contractId,
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      execution_percentage: executionPercentage,
      progress_note: String(body.progress_note || '').trim() || null,
      evidence_document_id: evidenceDocumentId,
      status: 'submitted',
      submitted_by: auth.context.userId,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  if (auth.access !== 'ED') {
    return NextResponse.json({ error: 'Legal está en modo solo lectura para tu cargo' }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || '').trim();
  const decision = String(body.decision || '').trim();

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  if (!['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'decision inválida' }, { status: 400 });
  }

  const { data: current, error: currentError } = await auth.context.supabase
    .from('contract_progress_updates')
    .select('id,contract_id,execution_percentage,status,evidence_document_id')
    .eq('id', id)
    .eq('organization_id', auth.context.organizationId)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Avance no encontrado' }, { status: 404 });
  if (current.status !== 'submitted') {
    return NextResponse.json({ error: 'Sólo se pueden revisar avances enviados' }, { status: 409 });
  }
  if (decision === 'approved' && !current.evidence_document_id) {
    return NextResponse.json({ error: 'No se puede aprobar un avance sin evidencia documental vinculada' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data, error } = await auth.context.supabase
    .from('contract_progress_updates')
    .update({
      status: decision,
      reviewed_by: auth.context.userId,
      reviewed_at: now,
      review_note: String(body.review_note || '').trim() || null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('organization_id', auth.context.organizationId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (decision === 'approved') {
    const { error: contractUpdateError } = await auth.context.supabase
      .from('contracts')
      .update({
        execution_percentage: Number(current.execution_percentage),
        updated_at: now,
      })
      .eq('id', current.contract_id)
      .eq('organization_id', auth.context.organizationId);

    if (contractUpdateError) {
      return NextResponse.json({
        error: 'El avance fue aprobado, pero no se pudo actualizar el porcentaje agregado del contrato.',
        detail: contractUpdateError.message,
        data,
      }, { status: 500 });
    }
  }

  return NextResponse.json({ data });
}
