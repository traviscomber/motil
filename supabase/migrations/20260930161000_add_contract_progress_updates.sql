begin;

create table if not exists public.contract_progress_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  period_start date,
  period_end date,
  execution_percentage numeric(5,2) not null,
  progress_note text,
  evidence_document_id uuid references public.module_documents(id) on delete set null,
  status text not null default 'submitted',
  submitted_by uuid,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  payment_request_id uuid references public.finance_payment_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_progress_updates_execution_check
    check (execution_percentage >= 0 and execution_percentage <= 100),
  constraint contract_progress_updates_status_check
    check (status in ('draft','submitted','approved','rejected')),
  constraint contract_progress_updates_period_check
    check (period_start is null or period_end is null or period_end >= period_start)
);

create index if not exists idx_contract_progress_org_contract_submitted
  on public.contract_progress_updates (organization_id, contract_id, submitted_at desc);

create index if not exists idx_contract_progress_org_status
  on public.contract_progress_updates (organization_id, status, submitted_at desc);

alter table public.contract_progress_updates enable row level security;

drop policy if exists contract_progress_updates_org_isolation on public.contract_progress_updates;
create policy contract_progress_updates_org_isolation
on public.contract_progress_updates
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

grant select, insert, update on table public.contract_progress_updates to authenticated;
grant select, insert, update, delete on table public.contract_progress_updates to service_role;

commit;
