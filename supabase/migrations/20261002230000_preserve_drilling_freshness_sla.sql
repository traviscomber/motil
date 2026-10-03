-- Preserve the existing production freshness SLA after moving drilling
-- freshness ownership from Plant to the canonical Drilling domain.

insert into public.operational_task_sla_policies (
  domain,
  severity,
  responsibility,
  due_hours,
  escalation_hours,
  escalation_cargo_name,
  enabled
)
select
  'drilling',
  severity,
  responsibility,
  due_hours,
  escalation_hours,
  escalation_cargo_name,
  enabled
from public.operational_task_sla_policies
where domain = 'plant'
  and responsibility = 'owner'
  and severity in ('critical', 'warning')
on conflict (domain, severity, responsibility) do update
set due_hours = excluded.due_hours,
    escalation_hours = excluded.escalation_hours,
    escalation_cargo_name = excluded.escalation_cargo_name,
    enabled = excluded.enabled;
