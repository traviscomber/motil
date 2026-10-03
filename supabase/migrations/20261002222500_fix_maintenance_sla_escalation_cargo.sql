-- Align maintenance SLA escalation with the canonical cargo catalog.
update public.operational_task_sla_policies
set escalation_cargo_name = 'Jefe Departamento de Mantenimiento'
where domain = 'maintenance'
  and severity = 'warning'
  and responsibility = 'owner'
  and escalation_cargo_name = 'Jefe Departamento de Mantención';
