begin;

create table if not exists public.maintenance_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recipient_profile_id uuid not null,
  recipient_person_id uuid,
  work_order_id uuid references public.maintenance_work_orders(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, recipient_profile_id, work_order_id, notification_type)
);

create index if not exists maintenance_notifications_recipient_idx
  on public.maintenance_notifications (organization_id, recipient_profile_id, read_at, created_at desc);

alter table public.maintenance_notifications enable row level security;
revoke all on public.maintenance_notifications from public, anon, authenticated;
grant all on public.maintenance_notifications to service_role;

commit;
