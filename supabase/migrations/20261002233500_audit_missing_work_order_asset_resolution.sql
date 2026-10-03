-- Resolve a missing work-order asset identity atomically and leave an audit event.
-- This function cannot replace an existing asset identity; reconciliation remains a separate workflow.

create or replace function public.resolve_missing_work_order_asset_identity_v1(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_canonical_asset_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_work_order public.maintenance_work_orders%rowtype;
  v_asset record;
begin
  select *
  into v_work_order
  from public.maintenance_work_orders
  where id = p_work_order_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'work_order_not_found';
  end if;

  if lower(coalesce(v_work_order.status, '')) in ('completed','closed','cancelled','canceled') then
    raise exception 'work_order_terminal';
  end if;

  if v_work_order.canonical_asset_id is not null then
    if v_work_order.canonical_asset_id = p_canonical_asset_id then
      return jsonb_build_object(
        'work_order_id', v_work_order.id,
        'canonical_asset_id', v_work_order.canonical_asset_id,
        'existing', true
      );
    end if;
    raise exception 'work_order_asset_already_resolved';
  end if;

  select id, asset_code, name
  into v_asset
  from public.maintenance_canonical_assets_v1
  where organization_id = p_organization_id
    and id = p_canonical_asset_id
    and is_active = true
  limit 1;

  if v_asset.id is null then
    raise exception 'canonical_asset_not_found';
  end if;

  update public.maintenance_work_orders
  set canonical_asset_id = p_canonical_asset_id,
      updated_at = now()
  where id = p_work_order_id
    and organization_id = p_organization_id;

  insert into public.work_order_events (
    organization_id,
    work_order_id,
    canonical_asset_id,
    event_type,
    actor_id,
    source_table,
    source_record_id,
    summary,
    payload
  ) values (
    p_organization_id,
    p_work_order_id,
    p_canonical_asset_id,
    'asset_identity_resolved',
    p_actor_id,
    'maintenance_work_orders',
    p_work_order_id::text,
    'Identidad canónica del equipo vinculada a la OT',
    jsonb_build_object(
      'canonical_asset_id', p_canonical_asset_id,
      'asset_code', v_asset.asset_code,
      'asset_name', v_asset.name,
      'previous_canonical_asset_id', null
    )
  );

  return jsonb_build_object(
    'work_order_id', p_work_order_id,
    'canonical_asset_id', p_canonical_asset_id,
    'asset_code', v_asset.asset_code,
    'asset_name', v_asset.name,
    'existing', false
  );
end;
$function$;

revoke all on function public.resolve_missing_work_order_asset_identity_v1(uuid,uuid,uuid,uuid) from public;
revoke execute on function public.resolve_missing_work_order_asset_identity_v1(uuid,uuid,uuid,uuid) from anon, authenticated;
grant execute on function public.resolve_missing_work_order_asset_identity_v1(uuid,uuid,uuid,uuid) to service_role;
