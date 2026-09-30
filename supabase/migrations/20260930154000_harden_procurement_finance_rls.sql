begin;

alter table public.procurement_accounts_payable enable row level security;
alter table public.procurement_supplier_payments enable row level security;
alter table public.procurement_supplier_credit_notes enable row level security;

drop policy if exists procurement_accounts_payable_org_isolation on public.procurement_accounts_payable;
create policy procurement_accounts_payable_org_isolation
on public.procurement_accounts_payable
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

drop policy if exists procurement_supplier_payments_org_isolation on public.procurement_supplier_payments;
create policy procurement_supplier_payments_org_isolation
on public.procurement_supplier_payments
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

drop policy if exists procurement_supplier_credit_notes_org_isolation on public.procurement_supplier_credit_notes;
create policy procurement_supplier_credit_notes_org_isolation
on public.procurement_supplier_credit_notes
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

commit;
