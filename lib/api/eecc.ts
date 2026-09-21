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

function mapEecc(row: any): EeccRecord {
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

  return {
    eecc: (data || []).map(mapEecc),
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
