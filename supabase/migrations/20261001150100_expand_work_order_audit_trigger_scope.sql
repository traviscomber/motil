-- Ensure every maintenance_work_orders UPDATE reaches the audit function,
-- not only status changes, and expose actor identity in work-order timelines.

drop trigger if exists trg_log_work_order_change on public.maintenance_work_orders;

create trigger trg_log_work_order_change
after insert or update on public.maintenance_work_orders
for each row execute function public.log_work_order_change();

create or replace function public.get_entity_timeline_v1(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'intelligence', 'pg_temp'
as $function$
  select coalesce(
    jsonb_agg(to_jsonb(t) order by t.event_at desc),
    '[]'::jsonb
  )
  from (
    select
      u.event_id,
      u.event_at,
      u.origin,
      u.event_type,
      u.source_table,
      u.source_record_id,
      u.work_order_id,
      u.canonical_asset_id,
      u.canonical_product_id,
      u.supplier_id,
      u.amount,
      u.currency,
      u.description,
      u.metadata,
      case
        when p_entity_type = 'work_order'
         and u.event_id like 'wo-event:%'
        then e.actor_id
        else null
      end as actor_id,
      case
        when p_entity_type = 'work_order'
         and u.event_id like 'wo-event:%'
        then e.actor_name
        else null
      end as actor_name
    from intelligence.universal_entity_timeline u
    left join public.work_order_events e
      on p_entity_type = 'work_order'
     and u.event_id like 'wo-event:%'
     and e.id::text = split_part(u.event_id, ':', 2)
     and e.organization_id = p_organization_id
    where u.organization_id = p_organization_id
      and u.entity_type = p_entity_type
      and u.entity_id = p_entity_id
    order by u.event_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) t;
$function$;
