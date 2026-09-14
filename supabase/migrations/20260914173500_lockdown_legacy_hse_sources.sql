-- Lock legacy HSE source tables behind the backend boundary.
-- Canonical tenant exposure is provided only through the explicit tenant-link views.

revoke all on public.incidents from anon, authenticated;
revoke all on public.risk_matrix from anon, authenticated;
revoke all on public.hse_inspections from anon, authenticated;

-- These historical RLS policies infer access from legacy equipment/user relationships.
-- They are not a canonical tenant boundary and must not remain as an apparent client contract.
drop policy if exists incidents_org_isolation on public.incidents;
drop policy if exists risk_matrix_org_isolation on public.risk_matrix;

comment on table public.incidents is
  'LEGACY backend-only HSE incident source. Client access is disabled; tenant exposure requires motil_hse_incident_tenant_links and canonical_hse_incidents_v1.';
comment on table public.risk_matrix is
  'LEGACY backend-only HSE risk source. Client access is disabled; tenant exposure requires motil_hse_risk_tenant_links and canonical_hse_risks_v1.';
comment on table public.hse_inspections is
  'LEGACY backend-only HSE inspection source. Current operational inspection UI uses tenant-scoped inspecciones_internas/inspecciones_externas; canonical legacy exposure requires the explicit HSE tenant boundary.';
