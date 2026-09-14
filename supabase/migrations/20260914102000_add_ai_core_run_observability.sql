create table if not exists public.motil_ai_core_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  conversation_id uuid not null,
  response_message_id uuid not null unique,
  domain text not null,
  specialist text not null default 'core',
  source_refs jsonb not null default '[]'::jsonb,
  source_count integer not null default 0 check (source_count >= 0),
  tool_count integer not null default 0 check (tool_count >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  model text,
  response_char_count integer not null default 0 check (response_char_count >= 0),
  evaluation_state text not null default 'not_evaluated' check (evaluation_state in ('not_evaluated','passed','failed','needs_review')),
  created_at timestamptz not null default now()
);

create index if not exists idx_motil_ai_core_runs_org_created
  on public.motil_ai_core_runs (organization_id, created_at desc);
create index if not exists idx_motil_ai_core_runs_org_user_created
  on public.motil_ai_core_runs (organization_id, user_id, created_at desc);

alter table public.motil_ai_core_runs enable row level security;
revoke all on table public.motil_ai_core_runs from anon, authenticated;
grant select, insert, update, delete on table public.motil_ai_core_runs to service_role;

create or replace function public.capture_motil_ai_core_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refs jsonb := coalesce(new.source_refs, '[]'::jsonb);
  v_latency_ms integer;
  v_specialist text := coalesce(nullif(new.domain, ''), 'core');
  v_source_count integer := 0;
  v_tool_count integer := 0;
begin
  if new.role <> 'assistant' then
    return new;
  end if;

  select count(*) filter (where elem ? 'source'), count(*) filter (where elem ? 'tool')
    into v_source_count, v_tool_count
  from jsonb_array_elements(v_refs) elem;

  if exists (
    select 1 from jsonb_array_elements(v_refs) elem
    where elem->>'tool' = 'read_equipment_intelligence'
  ) then
    v_specialist := 'equipment';
  elsif exists (
    select 1 from jsonb_array_elements(v_refs) elem
    where coalesce(elem->>'tool','') like 'read_executive_%'
  ) then
    v_specialist := 'executive';
  end if;

  select greatest(0, round(extract(epoch from (new.created_at - m.created_at)) * 1000)::integer)
    into v_latency_ms
  from public.motil_ai_messages m
  where m.conversation_id = new.conversation_id
    and m.organization_id = new.organization_id
    and m.user_id = new.user_id
    and m.role = 'user'
    and m.created_at <= new.created_at
  order by m.created_at desc
  limit 1;

  insert into public.motil_ai_core_runs (
    organization_id, user_id, conversation_id, response_message_id, domain, specialist,
    source_refs, source_count, tool_count, latency_ms, model, response_char_count, evaluation_state, created_at
  ) values (
    new.organization_id, new.user_id, new.conversation_id, new.id, new.domain, v_specialist,
    v_refs, v_source_count, v_tool_count, v_latency_ms, new.model, char_length(coalesce(new.content,'')), 'not_evaluated', new.created_at
  )
  on conflict (response_message_id) do nothing;

  return new;
end;
$$;

revoke all on function public.capture_motil_ai_core_run() from public, anon, authenticated;
grant execute on function public.capture_motil_ai_core_run() to service_role;

drop trigger if exists trg_capture_motil_ai_core_run on public.motil_ai_messages;
create trigger trg_capture_motil_ai_core_run
after insert on public.motil_ai_messages
for each row
when (new.role = 'assistant')
execute function public.capture_motil_ai_core_run();
