begin;

alter table public.maintenance_work_orders
  add column if not exists creation_request_id uuid;

create unique index if not exists maintenance_work_orders_idempotency_key
  on public.maintenance_work_orders (organization_id, created_by, creation_request_id)
  where creation_request_id is not null
    and created_by is not null;

comment on column public.maintenance_work_orders.creation_request_id is
  'Client idempotency key for OT creation. Repeated requests from the same creator and organization resolve to the same OT.';

commit;
