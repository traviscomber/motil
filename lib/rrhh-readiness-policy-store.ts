import type { ReadinessPolicy } from '@/lib/rrhh-readiness';

type SupabaseLike = {
  from: (table: string) => any;
};

function missingTable(error: any) {
  return error?.code === '42P01' || /rrhh_faena_readiness_(policies|requirements).*does not exist/i.test(String(error?.message || ''));
}

export async function loadActiveReadinessPolicies(
  supabase: SupabaseLike,
  organizationId: string,
): Promise<{ available: boolean; policies: ReadinessPolicy[]; error: string | null }> {
  const policyResult = await supabase
    .from('rrhh_faena_readiness_policies')
    .select('id,name,site_name,role_title,status,effective_from,effective_to,notes')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('site_name')
    .order('role_title');

  if (policyResult.error) {
    if (missingTable(policyResult.error)) return { available: false, policies: [], error: null };
    return { available: false, policies: [], error: String(policyResult.error.message || 'No se pudieron cargar las políticas de habilitación') };
  }

  const policies = (policyResult.data || []) as ReadinessPolicy[];
  const ids = policies.map((policy) => policy.id);
  if (!ids.length) return { available: true, policies: [], error: null };

  const requirementResult = await supabase
    .from('rrhh_faena_readiness_requirements')
    .select('id,policy_id,requirement_type,requirement_name,requirement_code,notes')
    .eq('organization_id', organizationId)
    .in('policy_id', ids)
    .order('requirement_type')
    .order('requirement_name');

  if (requirementResult.error) {
    if (missingTable(requirementResult.error)) return { available: false, policies: [], error: null };
    return { available: false, policies: [], error: String(requirementResult.error.message || 'No se pudieron cargar los requisitos de habilitación') };
  }

  const requirements = requirementResult.data || [];
  return {
    available: true,
    error: null,
    policies: policies.map((policy) => ({
      ...policy,
      requirements: requirements.filter((requirement: any) => requirement.policy_id === policy.id),
    })),
  };
}

export function isReadinessPolicyStorageMissing(error: any) {
  return missingTable(error);
}
