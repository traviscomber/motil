-- Assign drilling source freshness to the cargo that owns and edits drilling.
-- Plant and transport freshness ownership remain unchanged.

do $$
declare
  v_definition text;
  v_marker text := '''data_health:production:drilling_freshness''::text AS task_key';
  v_pos integer;
  v_prefix text;
  v_tail text;
begin
  select definition
  into v_definition
  from pg_views
  where schemaname = 'public'
    and viewname = 'operational_tasks_by_cargo_v7';

  if v_definition is null then
    raise exception 'operational_tasks_by_cargo_v7 not found';
  end if;

  v_pos := position(v_marker in v_definition);
  if v_pos = 0 then
    raise exception 'drilling freshness block not found in operational_tasks_by_cargo_v7';
  end if;

  v_prefix := substring(v_definition from 1 for v_pos - 1);
  v_tail := substring(v_definition from v_pos);

  if position('''plant''::text AS domain' in v_tail) = 0
     or position('''JEFE PLANTA''::text' in v_tail) = 0 then
    raise exception 'expected drilling freshness owner/domain not found';
  end if;

  v_tail := replace(v_tail, '''plant''::text AS domain', '''drilling''::text AS domain');
  v_tail := replace(v_tail, '''JEFE PLANTA''::text', '''JEFE SONDAJE''::text');

  execute 'create or replace view public.operational_tasks_by_cargo_v7 as ' || v_prefix || v_tail;
end
$$;
