begin;

create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  source_module text not null,
  title text not null,
  reason text not null,
  priority text not null default 'medium',
  operational_owner text,
  legal_owner text,
  due_at date,
  status text not null default 'new',
  action_required text,
  evidence_status text not null default 'pending',
  source_href text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, source_type, source_id),
  constraint legal_cases_priority_check check (priority in ('critical','high','medium','low')),
  constraint legal_cases_status_check check (status in ('new','in_review','action_required','waiting_area','closed')),
  constraint legal_cases_evidence_status_check check (evidence_status in ('pending','partial','complete','not_required'))
);

create index if not exists idx_legal_cases_org_status_due
  on public.legal_cases (organization_id, status, due_at);

alter table public.legal_cases enable row level security;

drop policy if exists legal_cases_org_isolation on public.legal_cases;
create policy legal_cases_org_isolation
on public.legal_cases
for all
to authenticated
using (
  organization_id in (
    select ur.organization_id
    from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
)
with check (
  organization_id in (
    select ur.organization_id
    from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
);

grant select, insert, update on table public.legal_cases to authenticated;
grant select, insert, update, delete on table public.legal_cases to service_role;

commit;
