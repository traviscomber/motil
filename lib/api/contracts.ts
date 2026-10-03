import { getSupabaseServerClient } from '@/lib/supabase-server';

type ContractStatus =
  | 'Borrador'
  | 'En Revisión'
  | 'Vigente'
  | 'Por Vencer'
  | 'Vencido';

interface CreateContractInput {
  organizationId: string;
  createdBy: string;
  title: string;
  contractNumber: string;
  description?: string;
  contractType: string;
  status?: string;
  contractValue?: number;
  currency?: string;
  paidAmount?: number;
  startDate?: string;
  endDate?: string;
  reviewDueDate?: string;
  responsiblePerson?: string;
  responsibleArea?: string;
  eeccId?: string;
  contractorName?: string;
  propertyName?: string;
  projectName?: string;
  royaltyRate?: number;
  guaranteeAmount?: number;
  complianceStatus?: string;
  complianceNotes?: string;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileMimeType?: string;
}

function daysUntil(date?: string | null) {
  if (!date) return undefined;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function normalizeInputStatus(status?: string | null): ContractStatus {
  switch (status) {
    case 'activo':
      return 'Vigente';
    case 'pendiente':
      return 'En Revisión';
    case 'pausado':
      return 'Borrador';
    case 'Borrador':
    case 'En Revisión':
    case 'Vigente':
    case 'Por Vencer':
    case 'Vencido':
      return status;
    default:
      return 'En Revisión';
  }
}

function normalizeContractStatus(contract: any): ContractStatus {
  const explicitStatus = contract.status as ContractStatus | undefined;
  const endDate = contract.end_date ? new Date(contract.end_date) : null;
  const now = new Date();

  if (endDate && endDate.getTime() < now.getTime()) {
    return 'Vencido';
  }

  if (endDate) {
    const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (remainingDays <= 30) {
      return 'Por Vencer';
    }
  }

  if (explicitStatus === 'En Revisión' || contract.compliance_status === 'Pendiente') {
    return 'En Revisión';
  }

  if (explicitStatus === 'Borrador') {
    return 'Borrador';
  }

  return 'Vigente';
}

function getPaymentStatus(contract: any) {
  const contractValue = Number(contract.contract_value || 0);
  const paidAmount = Number(contract.paid_amount || 0);

  if (contractValue <= 0) return 'sin_monto';
  if (paidAmount <= 0) return 'pendiente';
  if (paidAmount >= contractValue) return 'pagado';
  return 'parcial';
}

function resolvePropertySeriesKey(propertyName?: string | null) {
  const normalized = (propertyName || '').toLowerCase();
  if (normalized.includes('3')) return 'propiedad_3';
  if (normalized.includes('2')) return 'propiedad_2';
  return 'propiedad_1';
}

function mapContract(contract: any) {
  const contractValue = Number(contract.contract_value || 0);
  const paidAmount = Number(contract.paid_amount || 0);
  const guaranteeAmount = Number(contract.guarantee_amount || 0);
  const royaltyRate = Number(contract.royalty_rate || 0);
  const normalizedStatus = normalizeContractStatus(contract);

  return {
    id: contract.id,
    title: contract.title,
    contract_number: contract.contract_number,
    description: contract.description || '',
    contract_type: contract.contract_type,
    status: normalizedStatus,
    contract_value: contractValue,
    currency: contract.currency || 'CLP',
    paid_amount: paidAmount,
    pending_amount: Math.max(contractValue - paidAmount, 0),
    start_date: contract.start_date,
    end_date: contract.end_date,
    review_due_date: contract.review_due_date,
    responsible_person: contract.responsible_person || '',
    responsible_area: contract.responsible_area || '',
    contractor_name: contract.contractor_name || '',
    property_name: contract.property_name || '',
    project_name: contract.project_name || '',
    royalty_rate: royaltyRate,
    guarantee_amount: guaranteeAmount,
    compliance_status: contract.compliance_status || 'Pendiente',
    compliance_notes: contract.compliance_notes || '',
    file_url: contract.file_url || '',
    file_name: contract.file_name || '',
    payment_status: getPaymentStatus(contract),
    days_until_expiry: daysUntil(contract.end_date),
    days_until_review: daysUntil(contract.review_due_date),
    has_file: Boolean(contract.file_url),
    created_at: contract.created_at,
  };
}

export async function listContractsForOrganization(
  organizationId: string,
  search?: string | null
) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('contracts')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,contract_number.ilike.%${search}%,description.ilike.%${search}%,responsible_person.ilike.%${search}%,contractor_name.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return {
    contracts: (data || []).map(mapContract),
    total: count || 0,
  };
}

export async function createContract(input: CreateContractInput) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      title: input.title,
      contract_number: input.contractNumber,
      description: input.description || null,
      contract_type: input.contractType,
      status: normalizeInputStatus(input.status),
      contract_value: input.contractValue || 0,
      currency: input.currency || 'CLP',
      paid_amount: input.paidAmount || 0,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      review_due_date: input.reviewDueDate || null,
      responsible_person: input.responsiblePerson || null,
      responsible_area: input.responsibleArea || null,
      eecc_id: input.eeccId || null,
      contractor_name: input.contractorName || null,
      property_name: input.propertyName || null,
      project_name: input.projectName || null,
      royalty_rate: input.royaltyRate || 0,
      guarantee_amount: input.guaranteeAmount || 0,
      compliance_status: input.complianceStatus || 'Pendiente',
      compliance_notes: input.complianceNotes || null,
      file_url: input.fileUrl || null,
      file_path: input.filePath || null,
      file_name: input.fileName || null,
      file_size_bytes: input.fileSizeBytes || null,
      file_mime_type: input.fileMimeType || null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapContract(data);
}

export async function getContractsReport(organizationId: string, periodo: string) {
  const { contracts } = await listContractsForOrganization(organizationId);

  const pagosPorTratistaMap = new Map<
    string,
    { nombre: string; monto_pagado: number; monto_pendiente: number }
  >();
  const estadoPagosMap = new Map<
    string,
    { estado: string; cantidad: number; monto_total: number }
  >();
  const garantiasMap = new Map<string, { name: string; cantidad: number; monto: number }>();
  const regaliasByProperty = new Map<
    string,
    Record<string, string | number>
  >();

  for (const contract of contracts) {
    const contractorName = contract.contractor_name || 'Sin contratista';
    const pagosActuales = pagosPorTratistaMap.get(contractorName) || {
      nombre: contractorName,
      monto_pagado: 0,
      monto_pendiente: 0,
    };
    pagosActuales.monto_pagado += Number(contract.paid_amount || 0);
    pagosActuales.monto_pendiente += Number(contract.pending_amount || 0);
    pagosPorTratistaMap.set(contractorName, pagosActuales);

    const paymentStatus = contract.payment_status;
    const estadoActual = estadoPagosMap.get(paymentStatus) || {
      estado: paymentStatus,
      cantidad: 0,
      monto_total: 0,
    };
    estadoActual.cantidad += 1;
    estadoActual.monto_total += Number(contract.contract_value || 0);
    estadoPagosMap.set(paymentStatus, estadoActual);

    const garantiaCategoria =
      Number(contract.guarantee_amount || 0) <= 0
        ? 'Sin garantía'
        : contract.status === 'Vencido'
        ? 'Garantías vencidas'
        : contract.status === 'Por Vencer'
        ? 'Garantías por vencer'
        : 'Garantías activas';
    const garantiaActual = garantiasMap.get(garantiaCategoria) || {
      name: garantiaCategoria,
      cantidad: 0,
      monto: 0,
    };
    garantiaActual.cantidad += 1;
    garantiaActual.monto += Number(contract.guarantee_amount || 0);
    garantiasMap.set(garantiaCategoria, garantiaActual);

    const monthKey = new Date(contract.start_date || contract.created_at || Date.now())
      .toLocaleDateString('es-CL', { month: 'short' })
      .replace('.', '');
    const propertyKey = resolvePropertySeriesKey(contract.property_name);
    const royaltyAmount =
      (Number(contract.contract_value || 0) * Number(contract.royalty_rate || 0)) / 100;
    const existingMonth = regaliasByProperty.get(monthKey) || { mes: monthKey };
    existingMonth[propertyKey] = Number(existingMonth[propertyKey] || 0) + royaltyAmount;
    regaliasByProperty.set(monthKey, existingMonth);
  }

  return {
    periodo,
    resumen: {
      total_contratos: contracts.length,
      vigentes: contracts.filter((contract) => contract.status === 'Vigente').length,
      por_vencer: contracts.filter((contract) => contract.status === 'Por Vencer').length,
      vencidos: contracts.filter((contract) => contract.status === 'Vencido').length,
      en_revision: contracts.filter((contract) => contract.status === 'En Revisión').length,
      monto_total: contracts.reduce(
        (sum, contract) => sum + Number(contract.contract_value || 0),
        0
      ),
    },
    pagos_por_tratista: Array.from(pagosPorTratistaMap.values()).sort(
      (left, right) => right.monto_pagado - left.monto_pagado
    ),
    garantias_activas: Array.from(garantiasMap.values()),
    regalias_por_propiedad: Array.from(regaliasByProperty.values()),
    estado_pagos: Array.from(estadoPagosMap.values()),
  };
}

async function listLegalDocumentsForOrganization(organizationId: string) {
  const supabase = getSupabaseServerClient();
  const [membersResult, assetsResult] = await Promise.all([
    supabase.from('user_roles').select('user_id').eq('organization_id', organizationId),
    supabase.from('maintenance_assets').select('id').eq('organization_id', organizationId),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (assetsResult.error) throw assetsResult.error;

  const memberIds = (membersResult.data || []).map((row: any) => String(row.user_id)).filter(Boolean);
  const assetIds = (assetsResult.data || []).map((row: any) => String(row.id)).filter(Boolean);
  const ownershipFilters: string[] = [];
  if (memberIds.length) ownershipFilters.push(`uploaded_by.in.(${memberIds.join(',')})`);
  if (assetIds.length) ownershipFilters.push(`asset_id.in.(${assetIds.join(',')})`);
  if (!ownershipFilters.length) return [];

  const { data, error } = await supabase
    .from('module_documents')
    .select('id,document_name,document_type,category,status,l1_status,l2_status,valid_until,expires_at,file_path,file_url,uploaded_by,asset_id')
    .eq('module', 'legal')
    .is('deleted_at', null)
    .or(ownershipFilters.join(','));

  if (error) throw error;
  return data || [];
}

export async function getLegalComplianceOverview(organizationId: string) {
  const { contracts } = await listContractsForOrganization(organizationId);
  const documentRows = await listLegalDocumentsForOrganization(organizationId);

  const expiringContracts = contracts.filter((contract) => {
    const days = contract.days_until_expiry;
    return typeof days === 'number' && days >= 0 && days <= 30;
  });

  const contractsMissingFile = contracts.filter((contract) => !contract.has_file);
  const contractsPendingReview = contracts.filter(
    (contract) =>
      contract.status === 'En Revisión' || contract.compliance_status === 'Pendiente'
  );

  const expiringDocuments = documentRows.filter((document: any) => {
    const expiryDate = document.expires_at || document.valid_until;
    if (!expiryDate) return false;
    const days = daysUntil(expiryDate);
    return typeof days === 'number' && days >= 0 && days <= 30;
  });

  const expiredDocuments = documentRows.filter((document: any) => {
    const expiryDate = document.expires_at || document.valid_until;
    if (!expiryDate) return false;
    const days = daysUntil(expiryDate);
    return typeof days === 'number' && days < 0;
  });

  const approvedDocuments = documentRows.filter((document: any) => {
    const state = String(document.status || '').toLowerCase();
    const l2 = String(document.l2_status || '').toLowerCase();
    const l1 = String(document.l1_status || '').toLowerCase();
    return ['active', 'approved', 'aprobado', 'vigente'].includes(state) || l2 === 'cumple' || (l2 === '' && l1 === 'cumple');
  });

  return {
    summary: {
      total_contracts: contracts.length,
      active_contracts: contracts.filter((contract) => contract.status === 'Vigente').length,
      contracts_pending_review: contractsPendingReview.length,
      contracts_missing_file: contractsMissingFile.length,
      expiring_contracts: expiringContracts.length,
      expired_contracts: contracts.filter((contract) => contract.status === 'Vencido').length,
      legal_documents: documentRows.length,
      expiring_documents: expiringDocuments.length,
      approved_documents: approvedDocuments.length,
      expired_documents: expiredDocuments.length,
    },
    contracts_pending_review: contractsPendingReview.slice(0, 10),
    contracts_missing_file: contractsMissingFile.slice(0, 10),
    expiring_contracts: expiringContracts.slice(0, 10),
    expiring_documents: expiringDocuments.slice(0, 10).map((document: any) => ({
      id: document.id,
      title: document.document_name,
      expiry_date: document.expires_at || document.valid_until,
    })),
    expired_documents: expiredDocuments.slice(0, 10).map((document: any) => ({
      id: document.id,
      title: document.document_name,
      expiry_date: document.expires_at || document.valid_until,
    })),
  };
}

