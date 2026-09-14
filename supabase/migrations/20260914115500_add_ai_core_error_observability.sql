create table if not exists public.motil_ai_core_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  conversation_id uuid,
  domain text not null default 'executive',
  route_intent text,
  route_mode text,
  route_capabilities jsonb not null default '[]'::jsonb,
  failure_phase text not null,
  error_code text not null,
  http_status integer check (http_status is null or (http_status >= 400 and http_status <= 599)),
  created_at timestamptz not null default now()
);

create index if not exists idx_motil_ai_core_errors_org_created
  on public.motil_ai_core_errors (organization_id, created_at desc);
create index if not exists idx_motil_ai_core_errors_org_user_created
  on public.motil_ai_core_errors (organization_id, user_id, created_at desc);
create index if not exists idx_motil_ai_core_errors_code_created
  on public.motil_ai_core_errors (organization_id, error_code, created_at desc);

alter table public.motil_ai_core_errors enable row level security;
revoke all on table public.motil_ai_core_errors from anon, authenticated;
grant select, insert, update, delete on table public.motil_ai_core_errors to service_role;
