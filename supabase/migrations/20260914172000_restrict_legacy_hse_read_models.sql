-- Keep HSE-derived read models backend-only and SELECT-only.
-- Legacy views remain available for controlled compatibility; new consumers use the tenant-safe v2/v4 chain.

-- Tenant-safe current read models.
revoke all on public.hse_role_kpi_snapshot_v2 from anon, authenticated, service_role;
grant select on public.hse_role_kpi_snapshot_v2 to service_role;

revoke all on public.executive_operational_scorecard_v2 from anon, authenticated, service_role;
grant select on public.executive_operational_scorecard_v2 to service_role;

revoke all on public.operational_tasks_by_cargo_v4 from anon, authenticated, service_role;
grant select on public.operational_tasks_by_cargo_v4 to service_role;

revoke all on public.operational_tasks_by_cargo_summary_v4 from anon, authenticated, service_role;
grant select on public.operational_tasks_by_cargo_summary_v4 to service_role;

revoke all on public.operational_task_inbox_by_user_v2 from anon, authenticated, service_role;
grant select on public.operational_task_inbox_by_user_v2 to service_role;

revoke all on public.operational_task_inbox_summary_by_user_v2 from anon, authenticated, service_role;
grant select on public.operational_task_inbox_summary_by_user_v2 to service_role;

-- Legacy compatibility read models.
revoke all on public.hse_role_kpi_snapshot_v1 from anon, authenticated, service_role;
grant select on public.hse_role_kpi_snapshot_v1 to service_role;

revoke all on public.executive_operational_scorecard_v1 from anon, authenticated, service_role;
grant select on public.executive_operational_scorecard_v1 to service_role;

revoke all on public.operational_tasks_by_cargo_v3 from anon, authenticated, service_role;
grant select on public.operational_tasks_by_cargo_v3 to service_role;

revoke all on public.operational_tasks_by_cargo_summary_v3 from anon, authenticated, service_role;
grant select on public.operational_tasks_by_cargo_summary_v3 to service_role;

revoke all on public.operational_task_inbox_by_user_v1 from anon, authenticated, service_role;
grant select on public.operational_task_inbox_by_user_v1 to service_role;

revoke all on public.operational_task_inbox_summary_by_user_v1 from anon, authenticated, service_role;
grant select on public.operational_task_inbox_summary_by_user_v1 to service_role;

comment on view public.hse_role_kpi_snapshot_v1 is
  'LEGACY backend-only HSE KPI snapshot. Do not use for new consumers; use hse_role_kpi_snapshot_v2.';
comment on view public.executive_operational_scorecard_v1 is
  'LEGACY backend-only executive scorecard. Do not use for new consumers; use executive_operational_scorecard_v2.';
comment on view public.operational_tasks_by_cargo_v3 is
  'LEGACY backend-only role task feed. Do not use for new consumers; use operational_tasks_by_cargo_v4.';
comment on view public.operational_tasks_by_cargo_summary_v3 is
  'LEGACY backend-only role task summary. Do not use for new consumers; use operational_tasks_by_cargo_summary_v4.';
comment on view public.operational_task_inbox_by_user_v1 is
  'LEGACY backend-only inbox. Do not use for new consumers; use operational_task_inbox_by_user_v2.';
comment on view public.operational_task_inbox_summary_by_user_v1 is
  'LEGACY backend-only inbox summary. Do not use for new consumers; use operational_task_inbox_summary_by_user_v2.';
