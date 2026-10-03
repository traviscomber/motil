-- operational_role_inbox_coverage_v1 compares upper(cargos.name) to this array.
-- Keep the canonical cargo names uppercase in the comparison constants.

do $$
declare
  v_definition text;
begin
  select definition into v_definition
  from pg_views
  where schemaname = 'public' and viewname = 'operational_role_inbox_coverage_v1';

  if v_definition is null then
    raise exception 'operational_role_inbox_coverage_v1 not found';
  end if;

  if position('Jefe de Equipos Móviles y Estacionarios' in v_definition) = 0
     or position('Jefe Departamento de Mantenimiento' in v_definition) = 0
     or position('Jefe de Planificación' in v_definition) = 0 then
    raise exception 'Expected canonical maintenance cargo names not found in operational_role_inbox_coverage_v1';
  end if;

  v_definition := replace(v_definition, 'Jefe de Equipos Móviles y Estacionarios', 'JEFE DE EQUIPOS MÓVILES Y ESTACIONARIOS');
  v_definition := replace(v_definition, 'Jefe Departamento de Mantenimiento', 'JEFE DEPARTAMENTO DE MANTENIMIENTO');
  v_definition := replace(v_definition, 'Jefe de Planificación', 'JEFE DE PLANIFICACIÓN');

  execute 'create or replace view public.operational_role_inbox_coverage_v1 as ' || v_definition;
end
$$;
