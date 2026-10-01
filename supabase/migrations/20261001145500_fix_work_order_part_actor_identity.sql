create or replace function public.issue_work_order_part(
  p_work_order_id uuid,
  p_warehouse_stock_id uuid,
  p_quantity integer,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_asset uuid;
  v_stock public.warehouse_stock%rowtype;
  v_product_id uuid;
  v_part_id uuid;
  v_movement_id uuid;
  v_actor_profile_id uuid;
  v_actor_auth_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select organization_id, canonical_asset_id
    into v_org, v_asset
  from public.maintenance_work_orders
  where id = p_work_order_id
  for update;

  if v_org is null then raise exception 'OT no encontrada'; end if;

  v_actor_profile_id := public.current_application_user_id();

  if not exists (
    select 1 from public.user_roles
    where user_id = v_actor_profile_id and organization_id = v_org
  ) then
    raise exception 'Sin acceso a la organización';
  end if;

  select l.auth_user_id
    into v_actor_auth_id
  from public.auth_profile_identity_links l
  where l.profile_id = v_actor_profile_id
  limit 1;

  if v_actor_auth_id is null
     and exists (select 1 from auth.users u where u.id = v_actor_profile_id) then
    v_actor_auth_id := v_actor_profile_id;
  end if;

  if v_asset is null then raise exception 'La OT debe estar vinculada a un activo canónico'; end if;

  select * into v_stock
  from public.warehouse_stock
  where id = p_warehouse_stock_id and organization_id = v_org
  for update;

  if v_stock.id is null then raise exception 'Stock no encontrado'; end if;

  if coalesce(v_stock.quantity_available, v_stock.quantity_on_hand - v_stock.quantity_reserved, 0) < p_quantity then
    raise exception 'Stock disponible insuficiente';
  end if;

  select id into v_product_id
  from canonical.products
  where organization_id = v_org
    and lower(trim(product_code)) = lower(trim(v_stock.part_code))
  limit 1;

  if v_product_id is null then raise exception 'El repuesto no está vinculado al catálogo canónico'; end if;

  update public.warehouse_stock
  set quantity_on_hand = quantity_on_hand - p_quantity,
      updated_at = now()
  where id = v_stock.id;

  insert into public.stock_movements (
    organization_id, stock_id, movement_type, quantity,
    reference_doc, reference_id, work_order_id,
    canonical_asset_id, canonical_product_id,
    unit_cost, total_cost, performed_by, reason, notes
  ) values (
    v_org, v_stock.id, 'issue', p_quantity,
    'maintenance_work_order', p_work_order_id, p_work_order_id,
    v_asset, v_product_id,
    coalesce(v_stock.unit_cost, 0), p_quantity * coalesce(v_stock.unit_cost, 0),
    v_actor_auth_id, 'Consumo en orden de trabajo', p_notes
  ) returning id into v_movement_id;

  insert into public.work_order_parts (
    organization_id, work_order_id, canonical_asset_id,
    canonical_product_id, warehouse_stock_id, stock_movement_id,
    quantity_requested, quantity_reserved, quantity_issued,
    unit_cost, status, notes, created_by
  ) values (
    v_org, p_work_order_id, v_asset,
    v_product_id, v_stock.id, v_movement_id,
    p_quantity, p_quantity, p_quantity,
    coalesce(v_stock.unit_cost, 0), 'issued', p_notes, v_actor_profile_id
  ) returning id into v_part_id;

  insert into public.work_order_events (
    organization_id, work_order_id, canonical_asset_id,
    event_type, actor_id, source_table, source_record_id,
    summary, payload
  ) values (
    v_org, p_work_order_id, v_asset,
    'part_issued', v_actor_profile_id, 'work_order_parts', v_part_id::text,
    'Repuesto entregado desde inventario',
    jsonb_build_object(
      'product_id', v_product_id,
      'part_code', v_stock.part_code,
      'part_name', v_stock.part_name,
      'quantity', p_quantity,
      'unit_cost', coalesce(v_stock.unit_cost, 0),
      'total_cost', p_quantity * coalesce(v_stock.unit_cost, 0),
      'stock_movement_id', v_movement_id
    )
  );

  return v_part_id;
end;
$function$;
