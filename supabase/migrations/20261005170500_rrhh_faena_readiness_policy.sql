-- Explicit, tenant-scoped policies for RRHH faena readiness.
-- This migration only creates the policy model. It does not seed or infer any
-- operational requirement and does not change existing people evidence.

create table if not exists public.rrhh_faena_readiness_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  site_name text not null,
  role_title text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'retired')),
  effective_from date,
  effective_to date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rrhh_faena_readiness_policy_name_not_blank check (btrim(name) <> ''),
  constraint rrhh_faena_readiness_policy_site_not_blank check (btrim(site_name) <> ''),
  constraint rrhh_faena_readiness_policy_dates_valid
    check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique (id, organization_id)
);

create table if not exists public.rrhh_faena_readiness_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null,
  requirement_type text not null
    check (requirement_type in ('credential', 'competency', 'epp')),
  requirement_name text not null,
  requirement_code text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint rrhh_faena_readiness_requirement_name_not_blank check (btrim(requirement_name) <> ''),
  constraint rrhh_faena_readiness_requirement_policy_org_fk
    foreign key (policy_id, organization_id)
    references public.rrhh_faena_readiness_policies(id, organization_id)
    on delete cascade
);

create unique index if not exists rrhh_faena_readiness_active_scope_uidx
  on public.rrhh_faena_readiness_policies (
    organization_id,
    lower(btrim(site_name)),
    coalesce(lower(nullif(btrim(role_title), '')), '*')
  )
  where status = 'active';

create unique index if not exists rrhh_faena_readiness_requirement_uidx
  on public.rrhh_faena_readiness_requirements (
    policy_id,
    requirement_type,
    lower(btrim(requirement_name)),
    coalesce(lower(nullif(btrim(requirement_code), '')), '')
  );

create index if not exists rrhh_faena_readiness_policy_org_idx
  on public.rrhh_faena_readiness_policies (organization_id, status);

create index if not exists rrhh_faena_readiness_requirement_org_idx
  on public.rrhh_faena_readiness_requirements (organization_id, policy_id);

alter table public.rrhh_faena_readiness_policies enable row level security;
alter table public.rrhh_faena_readiness_requirements enable row level security;

revoke all on table public.rrhh_faena_readiness_policies from anon, authenticated;
revoke all on table public.rrhh_faena_readiness_requirements from anon, authenticated;
grant select, insert, update, delete on table public.rrhh_faena_readiness_policies to service_role;
grant select, insert, update, delete on table public.rrhh_faena_readiness_requirements to service_role;

comment on table public.rrhh_faena_readiness_policies is
  'Explicit human-configured readiness policies scoped by organization, site and optional role. No requirements are inferred.';
comment on table public.rrhh_faena_readiness_requirements is
  'Credential, competency and EPP requirements belonging to an explicit faena readiness policy.';
