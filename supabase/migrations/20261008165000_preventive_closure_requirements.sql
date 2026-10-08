-- Keep existing closure contracts intact while removing fault-only fields from preventive work.
DO $migration$
DECLARE
  view_sql text;
  function_sql text;
  guard text := 'lower(COALESCE(wo.work_type, ''''::text)) NOT IN (''preventive'', ''preventivo'')';
  field_name text;
  missing_expr text;
  present_expr text;
  function_signature regprocedure;
BEGIN
  view_sql := pg_get_viewdef('public.work_order_close_readiness_v2'::regclass, true);
  IF view_sql IS NULL THEN RAISE EXCEPTION 'Closure readiness view unavailable'; END IF;

  FOREACH field_name IN ARRAY ARRAY['root_cause', 'preventive_actions'] LOOP
    missing_expr := format('COALESCE(TRIM(BOTH FROM wo.%I), ''''::text) = ''''::text', field_name);
    present_expr := format('COALESCE(TRIM(BOTH FROM wo.%I), ''''::text) <> ''''::text', field_name);
    IF position(missing_expr IN view_sql) = 0 OR position(present_expr IN view_sql) = 0 THEN
      RAISE EXCEPTION 'Readiness expression changed for %', field_name;
    END IF;
    view_sql := replace(view_sql, missing_expr, '(' || guard || ' AND ' || missing_expr || ')');
    view_sql := replace(view_sql, present_expr, '(NOT (' || guard || ') OR ' || present_expr || ')');
  END LOOP;
  EXECUTE 'CREATE OR REPLACE VIEW public.work_order_close_readiness_v2 AS ' || view_sql;

  function_signature := to_regprocedure('public.close_work_order_safely(uuid)');
  IF function_signature IS NULL THEN RAISE EXCEPTION 'Closure function unavailable'; END IF;
  SELECT pg_get_functiondef(function_signature::oid) INTO function_sql;
  FOREACH field_name IN ARRAY ARRAY['root_cause', 'preventive_actions'] LOOP
    missing_expr := format('if coalesce(trim(v_wo.%I), '''') = '''' then', field_name);
    IF position(missing_expr IN function_sql) = 0 THEN
      RAISE EXCEPTION 'Closure function expression changed for %', field_name;
    END IF;
    function_sql := replace(function_sql, missing_expr,
      format('if lower(coalesce(v_wo.work_type, '''')) not in (''preventive'', ''preventivo'') and coalesce(trim(v_wo.%I), '''') = '''' then', field_name));
  END LOOP;
  EXECUTE function_sql;
END
$migration$;
