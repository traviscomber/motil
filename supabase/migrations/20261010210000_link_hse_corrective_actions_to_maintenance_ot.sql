-- HSE corrective actions and existing maintenance orders: auditable, organization-scoped links.
-- Intentionally does not change the state of either source record.
create table if not exists public.sostenibilidad_corrective_action_work_orders (
  id uuid primary key default gen_random_uuid(),
  corrective_action_id uuid not null references public.sostenibilidad_corrective_actions(id) on delete cascade,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  linked_by uuid not null references auth.users(id),
  linked_at timestamptz not null default now(),
  constraint sostenibilidad_ca_wo_unique unique (corrective_action_id, work_order_id)
);
create index if not exists sostenibilidad_ca_wo_org_idx
  on public.sostenibilidad_corrective_action_work_orders (organization_id, corrective_action_id);

create or replace function public.validate_sostenibilidad_ca_wo_organization()
returns trigger language plpgsql set search_path = public as $$
declare nc_org uuid; wo_org uuid;
begin
  select nc.organization_id into nc_org
  from public.sostenibilidad_corrective_actions ca
  join public.sostenibilidad_nonconformances nc on nc.id = ca.nc_id
  where ca.id = new.corrective_action_id;

  select organization_id into wo_org from public.maintenance_work_orders
  where id = new.work_order_id;

  if nc_org is null or wo_org is null or
     nc_org is distinct from wo_org or nc_org is distinct from new.organization_id then
    raise exception 'HSE action and work order must belong to the same organization'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists check_sostenibilidad_ca_wo_org on public.sostenibilidad_corrective_action_work_orders;
create trigger check_sostenibilidad_ca_wo_org
before insert or update on public.sostenibilidad_corrective_action_work_orders
for each row execute function public.validate_sostenibilidad_ca_wo_organization();

alter table public.sostenibilidad_corrective_action_work_orders enable row level security;
-- No direct anon/authenticated access: API enforces session, module RBAC and organization.
revoke all on public.sostenibilidad_corrective_action_work_orders from anon, authenticated;
