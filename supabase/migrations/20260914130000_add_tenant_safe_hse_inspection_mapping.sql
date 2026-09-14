create table if not exists public.motil_hse_inspection_tenant_links (
  inspection_id uuid primary key references public.hse_inspections(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  mapped_by_user_id uuid not null,
  mapping_reason text not null check (char_length(btrim(mapping_reason)) between 4 and 1000),
  mapping_evidence jsonb not null default '{}'::jsonb,
  mapped_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_motil_hse_inspection_tenant_links_org
  on public.motil_hse_inspection_tenant_links (organization_id, mapped_at desc);

alter table public.motil_hse_inspection_tenant_links enable row level security;
revoke all on table public.motil_hse_inspection_tenant_links from anon, authenticated;
grant select, insert, update, delete on table public.motil_hse_inspection_tenant_links to service_role;

create or replace view public.canonical_hse_inspections_v1
with (security_invoker = true)
as
select
  l.organization_id,
  h.id,
  h.inspection_number,
  h.inspection_type,
  h.scope,
  h.scheduled_date,
  h.actual_date,
  h.findings_count,
  h.status,
  h.notes,
  h.created_at,
  l.mapped_by_user_id,
  l.mapping_reason,
  l.mapping_evidence,
  l.mapped_at,
  l.updated_at as mapping_updated_at
from public.motil_hse_inspection_tenant_links l
join public.hse_inspections h on h.id = l.inspection_id;

revoke all on public.canonical_hse_inspections_v1 from anon, authenticated;
grant select on public.canonical_hse_inspections_v1 to service_role;

comment on table public.motil_hse_inspection_tenant_links is
  'Explicit human/data-governance tenant mapping for legacy hse_inspections rows that have no native organization_id. No row is mapped automatically.';

comment on view public.canonical_hse_inspections_v1 is
  'Tenant-safe read model exposing only legacy HSE inspections with an explicit organization mapping. Unmapped legacy rows remain excluded.';
