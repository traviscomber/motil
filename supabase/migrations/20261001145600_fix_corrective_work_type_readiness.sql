do $$
declare
  v_def text;
begin
  select pg_get_viewdef('public.work_order_close_readiness_v2'::regclass, true)
    into v_def;

  v_def := replace(
    v_def,
    'lower(COALESCE(wo.work_type, ''''::text)) = ''correctivo''::text',
    'lower(COALESCE(wo.work_type, ''''::text)) = ANY (ARRAY[''correctivo''::text, ''corrective''::text])'
  );

  v_def := replace(
    v_def,
    'lower(COALESCE(wo.work_type, ''''::text)) <> ''correctivo''::text',
    'NOT (lower(COALESCE(wo.work_type, ''''::text)) = ANY (ARRAY[''correctivo''::text, ''corrective''::text]))'
  );

  execute 'create or replace view public.work_order_close_readiness_v2 as ' || v_def;
end
$$;
