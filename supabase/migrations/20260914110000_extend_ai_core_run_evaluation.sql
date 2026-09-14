alter table public.motil_ai_core_runs
  add column if not exists evaluation_detail jsonb not null default '{}'::jsonb,
  add column if not exists evaluator_version text,
  add column if not exists evaluated_at timestamptz;

create index if not exists idx_motil_ai_core_runs_org_eval
  on public.motil_ai_core_runs (organization_id, evaluation_state, created_at desc);
