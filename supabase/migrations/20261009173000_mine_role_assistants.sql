begin;

-- Dedicated conversation namespace: never mix a mine-chief exchange with global production or executive memory.
alter table public.motil_ai_conversations drop constraint if exists motil_ai_conversations_domain_check;
alter table public.motil_ai_conversations add constraint motil_ai_conversations_domain_check
  check (domain in ('executive','inventory','procurement','production','finance','documents','data_health','mine_role'));
alter table public.motil_ai_messages drop constraint if exists motil_ai_messages_domain_check;
alter table public.motil_ai_messages add constraint motil_ai_messages_domain_check
  check (domain in ('executive','inventory','procurement','production','finance','documents','data_health','mine_role'));
alter table public.motil_ai_user_memory drop constraint if exists motil_ai_user_memory_domain_check;
alter table public.motil_ai_user_memory add constraint motil_ai_user_memory_domain_check
  check (domain in ('executive','inventory','procurement','production','finance','documents','data_health','mine_role'));

-- Requests only: no work order, purchase order, inventory, approval or operational task is mutated.
create table if not exists public.mine_assistant_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  mine_name text not null check (mine_name in ('Don Jaime','Peumo')),
  assistant_role text not null check (assistant_role in ('mine_manager','workshop_lead')),
  title text not null check (length(trim(title)) between 3 and 200),
  description text not null check (length(trim(description)) between 3 and 8000),
  status text not null default 'requested' check (status in ('requested','reviewed','cancelled')),
  source_message_id uuid not null references public.motil_ai_messages(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, source_message_id)
);
create index if not exists mine_assistant_requests_owner_idx
  on public.mine_assistant_requests(organization_id,user_id,created_at desc);
alter table public.mine_assistant_requests enable row level security;
revoke all on public.mine_assistant_requests from public,anon,authenticated;
grant select,insert,update on public.mine_assistant_requests to service_role;

commit;
