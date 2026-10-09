begin;

alter table public.maintenance_work_orders
  add column if not exists workshop_site text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.maintenance_work_orders'::regclass
      and conname = 'maintenance_work_orders_workshop_site_check'
  ) then
    alter table public.maintenance_work_orders
      add constraint maintenance_work_orders_workshop_site_check
      check (workshop_site is null or workshop_site in ('Don Jaime','San Pedro','Peumo'));
  end if;
end $$;

-- Only the already-verified workshop-head assignments are classified here.
-- Unknown mine / generic technicians / historic records remain unclassified.
update public.maintenance_work_orders wo
set workshop_site = case pe.role_title
  when 'Jefe de Taller Mina Don Jaime' then 'Don Jaime'
  when 'Jefe de Taller Mina San Pedro' then 'San Pedro'
  when 'Jefe de Taller Mina Peumo' then 'Peumo'
end
from public.people pe
where wo.organization_id = pe.organization_id
  and wo.assigned_person_id = pe.id
  and wo.workshop_site is null
  and wo.created_by is not null
  and pe.role_title in (
    'Jefe de Taller Mina Don Jaime',
    'Jefe de Taller Mina San Pedro',
    'Jefe de Taller Mina Peumo'
  );

create index if not exists maintenance_work_orders_workshop_site_idx
on public.maintenance_work_orders (organization_id, workshop_site, created_at desc)
where workshop_site is not null;

commit;
