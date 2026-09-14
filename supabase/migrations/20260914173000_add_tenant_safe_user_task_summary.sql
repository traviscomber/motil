create or replace view public.operational_task_inbox_summary_by_user_v2
with (security_invoker = true)
as
select user_id,
       profile_id,
       email,
       full_name,
       organization_id,
       cargo_id,
       cargo_name,
       count(*) filter (where responsibility='owner' and visible_now) as my_tasks,
       count(*) filter (where responsibility='owner' and visible_now and severity='critical') as my_critical,
       count(*) filter (where responsibility='owner' and visible_now and severity='warning') as my_warnings,
       count(*) filter (where responsibility='support' and visible_now) as support_items,
       count(*) filter (where responsibility='escalation' and visible_now) as escalations,
       count(*) filter (where user_state='snoozed' and not visible_now) as snoozed_items,
       max(priority_score) filter (where visible_now) as max_priority
from public.operational_task_inbox_by_user_v2
group by user_id, profile_id, email, full_name, organization_id, cargo_id, cargo_name;

revoke all on public.operational_task_inbox_summary_by_user_v2 from anon, authenticated;
grant select on public.operational_task_inbox_summary_by_user_v2 to service_role;

comment on view public.operational_task_inbox_summary_by_user_v2 is
  'Backend-only tenant-safe user task summary sourced exclusively from operational_task_inbox_by_user_v2.';

comment on view public.operational_task_inbox_summary_by_user_v1 is
  'DEPRECATED legacy summary. Depends on operational_task_inbox_by_user_v1 and operational_tasks_by_cargo_v3, which may read non-tenant-scoped HSE legacy tables. Do not add new consumers.';
comment on view public.operational_task_inbox_by_user_v1 is
  'DEPRECATED legacy inbox. New consumers must use operational_task_inbox_by_user_v2.';
comment on view public.operational_tasks_by_cargo_v3 is
  'DEPRECATED legacy task feed. New consumers must use operational_tasks_by_cargo_v4.';
comment on view public.operational_tasks_by_cargo_summary_v3 is
  'DEPRECATED legacy cargo summary. New consumers must use operational_tasks_by_cargo_summary_v4.';
comment on view public.executive_operational_scorecard_v1 is
  'DEPRECATED legacy executive scorecard. New consumers must use executive_operational_scorecard_v2.';
