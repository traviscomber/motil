-- Canonical inventory current-state must deduplicate snapshot aliases after
-- product-code normalization. Historical snapshot rows remain untouched.

do $$
declare
  v_definition text;
  v_old_distinct text;
  v_new_distinct text;
  v_old_order text;
  v_new_order text;
begin
  select definition
  into v_definition
  from pg_views
  where schemaname = 'public'
    and viewname = 'canonical_inventory_current';

  if v_definition is null then
    raise exception 'canonical_inventory_current not found';
  end if;

  v_old_distinct := 'SELECT DISTINCT ON (inventory_snapshots.organization_id, inventory_snapshots.product_code)';
  v_new_distinct := 'SELECT DISTINCT ON (inventory_snapshots.organization_id, upper(TRIM(BOTH FROM inventory_snapshots.product_code)))';

  v_old_order := 'ORDER BY inventory_snapshots.organization_id, inventory_snapshots.product_code, inventory_snapshots.snapshot_date DESC, inventory_snapshots.imported_at DESC';
  v_new_order := 'ORDER BY inventory_snapshots.organization_id, upper(TRIM(BOTH FROM inventory_snapshots.product_code)), inventory_snapshots.snapshot_date DESC, inventory_snapshots.imported_at DESC';

  if position(v_old_distinct in v_definition) = 0 then
    raise exception 'expected inventory snapshot distinct key not found';
  end if;

  if position(v_old_order in v_definition) = 0 then
    raise exception 'expected inventory snapshot ordering not found';
  end if;

  v_definition := replace(v_definition, v_old_distinct, v_new_distinct);
  v_definition := replace(v_definition, v_old_order, v_new_order);

  execute 'create or replace view public.canonical_inventory_current as ' || v_definition;
end
$$;
