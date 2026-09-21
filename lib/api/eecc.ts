import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface EeccRecord {
  id: string;
  name: string;
  rut: string;
  representative: string;
  email: string;
  phone: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  f30_status: string;
  f30_approved_on: string;
  f301_status: string;
  f301_approved_on: string;
}

export interface CreateEeccInput {
  organizationId: string;
  createdBy?: string;
  name: string;
  rut?: string;
  representative?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateEeccInput {
  name?: string;
  rut?: string;
  representative?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  notes?: string;
}

function mapEecc(row: any, compliance?: Record<string, any>): EeccRecord {
  return {
    id: row.id,
    name: row.name || '',
    rut: row.rut || '',
    representative: row.representative || '',
    email: row.email || '',
    phone: row.phone || '',
    is_active: row.is_active !== false,
    notes: row.notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    f30_status: compliance?.F30?.status || 'sin_registro',
    f30_approved_on: compliance?.F30?.approved_on || '',
    f301_status: compliance?.['F30-1']?.status || 'sin_registro',
    f301_approved_on: compliance?.['F30-1']?.approved_on || '',
  };
}

export async function listEeccForOrganization(
  organizationId: string,
  options?: { search?: string | null; onlyActive?: boolean }
) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('eecc')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (options?.onlyActive) {
    query = query.eq('is_active', true);
  }

  if (options?.search) {
    const term = options.search;
    query = query.or(
      `name.ilike.%${term}%,rut.ilike.%${term}%,representative.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, count, error } = await query.order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const eeccRows = data || [];
  const ids = eeccRows.map((row: any) => row.id);
  const complianceByEecc: Record<string, Record<string, any>> = {};

  if (ids.length > 0) {
    const { data: compliance, error: complianceError } = await supabase
      .from('eecc_compliance_documents')
      .select('eecc_id,document_type,status,approved_on')
      .eq('organization_id', organizationId)
      .in('eecc_id', ids);

    if (complianceError) {
      throw complianceError;
    }

    for (const row of compliance || []) {
      complianceByEecc[row.eecc_id] ||= {};
      complianceByEecc[row.eecc_id][row.document_type] = row;
    }
  }

  return {
    eecc: eeccRows.map((row: any) => mapEecc(row, complianceByEecc[row.id])),
    total: count || 0,
  };
}

export async function createEecc(input: CreateEeccInput) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('eecc')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy || null,
      name: input.name,
      rut: input.rut || null,
      representative: input.representative || null,
      email: input.email || null,
      phone: input.phone || null,
      is_active: input.isActive !== false,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapEecc(data);
}

export async function updateEecc(
  organizationId: string,
  id: string,
  input: UpdateEeccInput
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) patch.name = input.name;
  if (input.rut !== undefined) patch.rut = input.rut || null;
  if (input.representative !== undefined) patch.representative = input.representative || null;
  if (input.email !== undefined) patch.email = input.email || null;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.notes !== undefined) patch.notes = input.notes || null;

  const { data, error } = await supabase
    .from('eecc')
    .update(patch)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapEecc(data);
}

export async function deleteEecc(organizationId: string, id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('eecc')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    throw error;
  }

  return { success: true };
}
