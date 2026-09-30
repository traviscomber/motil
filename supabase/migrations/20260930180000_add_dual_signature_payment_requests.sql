begin;

create table if not exists public.finance_payment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payable_id uuid not null references public.procurement_accounts_payable(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null,
  requested_payment_date date,
  status text not null default 'pending_signatures',
  required_signatures integer not null default 2 check (required_signatures >= 2),
  request_note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_payment_id uuid references public.procurement_supplier_payments(id),
  executed_by uuid,
  executed_at timestamptz,
  bank_reference text,
  evidence_url text,
  evidence_document_id uuid references public.module_documents(id),
  constraint finance_payment_requests_status_check
    check (status in ('pending_signatures','approved','executed','rejected','cancelled'))
);

create table if not exists public.finance_payment_request_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.finance_payment_requests(id) on delete cascade,
  signer_id uuid not null,
  decision text not null default 'approved',
  note text,
  signed_at timestamptz not null default now(),
  unique (request_id, signer_id),
  constraint finance_payment_request_signatures_decision_check
    check (decision in ('approved','rejected'))
);

create index if not exists idx_fin_payment_requests_org_status
  on public.finance_payment_requests (organization_id, status, created_at desc);

create index if not exists idx_fin_payment_signatures_request
  on public.finance_payment_request_signatures (request_id, signed_at);

alter table public.finance_payment_requests enable row level security;
alter table public.finance_payment_request_signatures enable row level security;

drop policy if exists finance_payment_requests_org_isolation on public.finance_payment_requests;
create policy finance_payment_requests_org_isolation
on public.finance_payment_requests
for all
to authenticated
using (
  organization_id in (
    select ur.organization_id from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
)
with check (
  organization_id in (
    select ur.organization_id from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
);

drop policy if exists finance_payment_signatures_org_isolation on public.finance_payment_request_signatures;
create policy finance_payment_signatures_org_isolation
on public.finance_payment_request_signatures
for all
to authenticated
using (
  organization_id in (
    select ur.organization_id from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
)
with check (
  organization_id in (
    select ur.organization_id from public.user_roles ur
    where ur.user_id = (select current_application_user_id())
  )
);

grant select, insert, update on public.finance_payment_requests to authenticated;
grant select, insert on public.finance_payment_request_signatures to authenticated;
grant select, insert, update, delete on public.finance_payment_requests to service_role;
grant select, insert, update, delete on public.finance_payment_request_signatures to service_role;

commit;
