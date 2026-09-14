create table if not exists public.motil_ai_decision_case_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  decision_case_id uuid not null references public.motil_ai_decision_cases(id) on delete cascade,
  created_by_user_id uuid not null,
  source_domain text not null,
  target_domain text not null,
  event_kind text not null check (event_kind in ('created','updated')),
  before_state jsonb,
  after_state jsonb not null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_motil_ai_decision_case_events_scope
  on public.motil_ai_decision_case_events (organization_id, created_by_user_id, occurred_at desc);
create index if not exists idx_motil_ai_decision_case_events_case
  on public.motil_ai_decision_case_events (organization_id, decision_case_id, occurred_at desc);

alter table public.motil_ai_decision_case_events enable row level security;
revoke all on table public.motil_ai_decision_case_events from anon, authenticated;
grant select, insert, update, delete on table public.motil_ai_decision_case_events to service_role;

create or replace function public.capture_motil_ai_decision_case_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.motil_ai_decision_case_events (
    organization_id,
    decision_case_id,
    created_by_user_id,
    source_domain,
    target_domain,
    event_kind,
    before_state,
    after_state,
    occurred_at
  ) values (
    new.organization_id,
    new.id,
    new.created_by_user_id,
    new.source_domain,
    new.target_domain,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    now()
  );
  return new;
end;
$$;

drop trigger if exists trg_capture_motil_ai_decision_case_event on public.motil_ai_decision_cases;
create trigger trg_capture_motil_ai_decision_case_event
after insert or update on public.motil_ai_decision_cases
for each row execute function public.capture_motil_ai_decision_case_event();