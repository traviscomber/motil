begin;

create table if not exists public.work_order_supervisor_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved')),
  decision_note text,
  reviewed_by_profile_id uuid,
  reviewed_by_person_id uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, work_order_id)
);

create index if not exists work_order_supervisor_reviews_org_status_idx
  on public.work_order_supervisor_reviews (organization_id, status, updated_at desc);

alter table public.work_order_supervisor_reviews enable row level security;
revoke all on public.work_order_supervisor_reviews from public, anon, authenticated;
grant all on public.work_order_supervisor_reviews to service_role;

commit;
