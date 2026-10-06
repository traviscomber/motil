begin;

create table if not exists public.mineral_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  settlement_number text not null,
  settlement_date date not null,
  contract_id uuid references public.contracts(id) on delete set null,
  settlement_document_id uuid references public.module_documents(id) on delete set null,
  currency text not null default 'CLP',
  gross_amount numeric,
  deductions_amount numeric,
  net_amount numeric,
  due_date date,
  status text not null default 'draft',
  payable_id uuid references public.procurement_accounts_payable(id) on delete set null,
  payment_request_id uuid references public.finance_payment_requests(id) on delete set null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mineral_settlements_status_check
    check (status in ('draft','submitted','approved','paid','closed','rejected')),
  constraint mineral_settlements_amounts_check
    check (
      (gross_amount is null or gross_amount >= 0)
      and (deductions_amount is null or deductions_amount >= 0)
      and (net_amount is null or net_amount >= 0)
    ),
  unique (organization_id, settlement_number)
);

create table if not exists public.mineral_settlement_shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  settlement_id uuid not null references public.mineral_settlements(id) on delete cascade,
  shipment_id uuid not null references public.production_concentrate_shipments(id) on delete restrict,
  settled_metric_tons numeric,
  created_at timestamptz not null default now(),
  constraint mineral_settlement_shipments_tons_check
    check (settled_metric_tons is null or settled_metric_tons >= 0),
  unique (settlement_id, shipment_id)
);

create index if not exists idx_mineral_settlements_org_status_date
  on public.mineral_settlements (organization_id, status, settlement_date desc);

create index if not exists idx_mineral_settlement_shipments_org_settlement
  on public.mineral_settlement_shipments (organization_id, settlement_id);

alter table public.mineral_settlements enable row level security;
alter table public.mineral_settlement_shipments enable row level security;

drop policy if exists mineral_settlements_org_isolation on public.mineral_settlements;
create policy mineral_settlements_org_isolation
on public.mineral_settlements
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

drop policy if exists mineral_settlement_shipments_org_isolation on public.mineral_settlement_shipments;
create policy mineral_settlement_shipments_org_isolation
on public.mineral_settlement_shipments
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

grant select, insert, update on table public.mineral_settlements to authenticated;
grant select, insert, update on table public.mineral_settlement_shipments to authenticated;
grant select, insert, update, delete on table public.mineral_settlements to service_role;
grant select, insert, update, delete on table public.mineral_settlement_shipments to service_role;

commit;
