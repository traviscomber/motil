create table if not exists public.motil_hse_incident_tenant_links (
  incident_id uuid primary key references public.incidents(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  mapped_by_user_id uuid not null,
  mapping_reason text not null check (char_length(btrim(mapping_reason)) between 4 and 1000),
  mapping_evidence jsonb not null default '{}'::jsonb,
  mapped_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_motil_hse_incident_tenant_links_org
  on public.motil_hse_incident_tenant_links (organization_id, mapped_at desc);

alter table public.motil_hse_incident_tenant_links enable row level security;
revoke all on table public.motil_hse_incident_tenant_links from anon, authenticated;
grant select, insert, update, delete on table public.motil_hse_incident_tenant_links to service_role;

create table if not exists public.motil_hse_risk_tenant_links (
  risk_id uuid primary key references public.risk_matrix(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  mapped_by_user_id uuid not null,
  mapping_reason text not null check (char_length(btrim(mapping_reason)) between 4 and 1000),
  mapping_evidence jsonb not null default '{}'::jsonb,
  mapped_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_motil_hse_risk_tenant_links_org
  on public.motil_hse_risk_tenant_links (organization_id, mapped_at desc);

alter table public.motil_hse_risk_tenant_links enable row level security;
revoke all on table public.motil_hse_risk_tenant_links from anon, authenticated;
grant select, insert, update, delete on table public.motil_hse_risk_tenant_links to service_role;

create or replace view public.canonical_hse_incidents_v1
with (security_invoker = true)
as
select
  l.organization_id,
  i.id,
  i.incident_number,
  i.date_occurred,
  i.date_reported,
  i.location,
  i.equipment_id,
  i.incident_type,
  i.severity,
  i.description,
  i.people_involved,
  i.injuries_count,
  i.reported_by,
  i.assigned_to,
  i.status,
  i.investigation_status,
  i.root_cause_identified,
  i.created_at,
  i.updated_at,
  l.mapped_by_user_id,
  l.mapping_reason,
  l.mapping_evidence,
  l.mapped_at,
  l.updated_at as mapping_updated_at
from public.motil_hse_incident_tenant_links l
join public.incidents i on i.id = l.incident_id;

revoke all on public.canonical_hse_incidents_v1 from anon, authenticated;
grant select on public.canonical_hse_incidents_v1 to service_role;

create or replace view public.canonical_hse_risks_v1
with (security_invoker = true)
as
select
  l.organization_id,
  r.id,
  r.hazard_id,
  r.hazard_description,
  r.process_or_area,
  r.likelihood,
  r.severity,
  r.risk_level,
  r.current_controls,
  r.control_effectiveness,
  r.residual_risk_level,
  r.risk_owner,
  r.mitigation_plan,
  r.last_review_date,
  r.next_review_date,
  r.status,
  r.created_at,
  r.updated_at,
  l.mapped_by_user_id,
  l.mapping_reason,
  l.mapping_evidence,
  l.mapped_at,
  l.updated_at as mapping_updated_at
from public.motil_hse_risk_tenant_links l
join public.risk_matrix r on r.id = l.risk_id;

revoke all on public.canonical_hse_risks_v1 from anon, authenticated;
grant select on public.canonical_hse_risks_v1 to service_role;

comment on table public.motil_hse_incident_tenant_links is
  'Explicit human/data-governance tenant mapping for legacy incidents rows without native organization_id. No row is mapped automatically.';
comment on table public.motil_hse_risk_tenant_links is
  'Explicit human/data-governance tenant mapping for legacy risk_matrix rows without native organization_id. No row is mapped automatically.';
comment on view public.canonical_hse_incidents_v1 is
  'Tenant-safe read model exposing only legacy HSE incidents with an explicit organization mapping. Unmapped rows remain excluded.';
comment on view public.canonical_hse_risks_v1 is
  'Tenant-safe read model exposing only legacy HSE risks with an explicit organization mapping. Unmapped rows remain excluded.';
