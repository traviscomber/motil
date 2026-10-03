-- Split drilling-review responsibility by lifecycle:
-- pending warning => Sondaje decides whether maintenance action is warranted.
-- accepted warning => Maintenance owns execution; Planning/Equipment support.
-- critical out-of-service keeps the existing Maintenance/Equipment path.

do $$
declare
  v_definition text;
  old_primary text;
  new_primary text;
  old_support text;
  new_support text;
begin
  select definition into v_definition
  from pg_views
  where schemaname='public' and viewname='operational_tasks_by_cargo_v2';

  if v_definition is null then
    raise exception 'operational_tasks_by_cargo_v2 not found';
  end if;

  old_primary := $needle$
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text) AND (a_1.severity = 'critical'::text)) THEN 'Jefe de Equipos Móviles y Estacionarios'::text
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text)) THEN 'JEFE SONDAJE'::text
$needle$;

  new_primary := $replacement$
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text) AND (a_1.severity = 'critical'::text)) THEN 'Jefe de Equipos Móviles y Estacionarios'::text
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text) AND (a_1.status = 'accepted'::text)) THEN 'Jefe Departamento de Mantenimiento'::text
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text)) THEN 'JEFE SONDAJE'::text
$replacement$;

  if position(old_primary in v_definition) = 0 then
    raise exception 'expected drilling primary-owner routing not found';
  end if;
  v_definition := replace(v_definition, old_primary, new_primary);

  old_support := $needle$
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text)) THEN ARRAY['Jefe Departamento de Mantenimiento'::text, 'Jefe de Planificación'::text]
$needle$;

  new_support := $replacement$
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text) AND (a_1.severity = 'critical'::text)) THEN ARRAY['Jefe Departamento de Mantenimiento'::text, 'Jefe de Planificación'::text]
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text) AND (a_1.status = 'accepted'::text)) THEN ARRAY['Jefe de Planificación'::text, 'Jefe de Equipos Móviles y Estacionarios'::text]
                    WHEN ((a_1.domain = 'maintenance'::text) AND (a_1.evidence_summary ~~* '%drilling%'::text)) THEN ARRAY[]::text[]
$replacement$;

  if position(old_support in v_definition) = 0 then
    raise exception 'expected drilling support routing not found';
  end if;
  v_definition := replace(v_definition, old_support, new_support);

  execute 'create or replace view public.operational_tasks_by_cargo_v2 as ' || v_definition;
end
$$;
