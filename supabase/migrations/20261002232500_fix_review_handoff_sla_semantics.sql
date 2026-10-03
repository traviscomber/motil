-- Keep drilling review handoff SLA semantics coherent:
-- 1) once accepted, timing starts from the human acceptance timestamp;
-- 2) never emit a redundant escalation to the same cargo that already owns the task.

do $$
declare
  v_definition text;
begin
  select definition into v_definition
  from pg_views
  where schemaname='public' and viewname='operational_attention_global_v1';

  if v_definition is null then
    raise exception 'operational_attention_global_v1 not found';
  end if;

  if position('m.created_at AS occurred_at' in v_definition) = 0 then
    raise exception 'maintenance review occurred_at expression not found';
  end if;

  v_definition := replace(
    v_definition,
    'm.created_at AS occurred_at',
    'CASE WHEN m.status = ''accepted''::text THEN COALESCE(m.reviewed_at, m.updated_at, m.created_at) ELSE m.created_at END AS occurred_at'
  );

  execute 'create or replace view public.operational_attention_global_v1 as ' || v_definition;

  select definition into v_definition
  from pg_views
  where schemaname='public' and viewname='role_task_escalations_v1';

  if v_definition is null then
    raise exception 'role_task_escalations_v1 not found';
  end if;

  if position('now() >= t.escalation_at' in v_definition) = 0 then
    raise exception 'role task escalation predicate not found';
  end if;

  v_definition := replace(
    v_definition,
    'now() >= t.escalation_at',
    'now() >= t.escalation_at AND c.name <> t.cargo_name'
  );

  execute 'create or replace view public.role_task_escalations_v1 as ' || v_definition;
end
$$;
