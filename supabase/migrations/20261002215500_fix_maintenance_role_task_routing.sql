-- Keep operational responsibility routing aligned with the canonical cargo catalog.
-- This preserves the existing ownership/support semantics and only replaces stale cargo names.

do $$
declare
  v_definition text;
begin
  select definition into v_definition
  from pg_views
  where schemaname = 'public' and viewname = 'operational_tasks_by_cargo_v2';

  if v_definition is null then
    raise exception 'operational_tasks_by_cargo_v2 not found';
  end if;

  if position('Jefe Departamento de Mantención' in v_definition) = 0
     or position('Planificador Departamento Mantención Mecánica' in v_definition) = 0
     or position('JEFE MAN. EQ' in v_definition) = 0 then
    raise exception 'Expected legacy maintenance cargo names not found in operational_tasks_by_cargo_v2';
  end if;

  v_definition := replace(v_definition, 'Jefe Departamento de Mantención', 'Jefe Departamento de Mantenimiento');
  v_definition := replace(v_definition, 'Planificador Departamento Mantención Mecánica', 'Jefe de Planificación');
  v_definition := replace(v_definition, 'JEFE MAN. EQ', 'Jefe de Equipos Móviles y Estacionarios');

  execute 'create or replace view public.operational_tasks_by_cargo_v2 as ' || v_definition;

  select definition into v_definition
  from pg_views
  where schemaname = 'public' and viewname = 'operational_tasks_by_cargo_v5';

  if v_definition is null then
    raise exception 'operational_tasks_by_cargo_v5 not found';
  end if;

  if position('JEFE MANT EQ. MINA' in v_definition) = 0 then
    raise exception 'Expected legacy maintenance cargo name not found in operational_tasks_by_cargo_v5';
  end if;

  v_definition := replace(v_definition, 'JEFE MANT EQ. MINA', 'Jefe de Equipos Móviles y Estacionarios');
  execute 'create or replace view public.operational_tasks_by_cargo_v5 as ' || v_definition;

  select definition into v_definition
  from pg_views
  where schemaname = 'public' and viewname = 'operational_tasks_by_cargo_v6';

  if v_definition is null then
    raise exception 'operational_tasks_by_cargo_v6 not found';
  end if;

  if position('Jefe Departamento de Mantención' in v_definition) = 0 then
    raise exception 'Expected legacy maintenance cargo name not found in operational_tasks_by_cargo_v6';
  end if;

  v_definition := replace(v_definition, 'Jefe Departamento de Mantención', 'Jefe Departamento de Mantenimiento');
  execute 'create or replace view public.operational_tasks_by_cargo_v6 as ' || v_definition;

  select definition into v_definition
  from pg_views
  where schemaname = 'public' and viewname = 'operational_role_inbox_coverage_v1';

  if v_definition is null then
    raise exception 'operational_role_inbox_coverage_v1 not found';
  end if;

  if position('Jefe Departamento de Mantención' in v_definition) = 0
     or position('Planificador Departamento Mantención Mecánica' in v_definition) = 0
     or position('JEFE MAN. EQ' in v_definition) = 0 then
    raise exception 'Expected legacy maintenance cargo names not found in operational_role_inbox_coverage_v1';
  end if;

  v_definition := replace(v_definition, 'Jefe Departamento de Mantención', 'Jefe Departamento de Mantenimiento');
  v_definition := replace(v_definition, 'Planificador Departamento Mantención Mecánica', 'Jefe de Planificación');
  v_definition := replace(v_definition, 'JEFE MAN. EQ', 'Jefe de Equipos Móviles y Estacionarios');

  execute 'create or replace view public.operational_role_inbox_coverage_v1 as ' || v_definition;
end
$$;
