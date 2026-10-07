begin;

do $$
begin
  if exists (
    select 1
    from public.maintenance_work_orders legacy
    join public.maintenance_work_orders canonical
      on canonical.organization_id = legacy.organization_id
     and canonical.work_order_number = regexp_replace(legacy.work_order_number, '^WO-', 'OT-')
    where legacy.work_order_number like 'WO-%'
  ) then
    raise exception 'Cannot rename WO identifiers to OT because one or more OT identifiers already exist';
  end if;
end $$;

update public.maintenance_work_orders
set work_order_number = regexp_replace(work_order_number, '^WO-', 'OT-')
where work_order_number like 'WO-%';

create or replace function public.create_work_order_from_operational_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_created_by uuid,
  p_title text,
  p_work_type text default null::text,
  p_priority text default null::text,
  p_scheduled_date date default null::date,
  p_description text default null::text
)
returns table(
  work_order_id uuid,
  work_order_number text,
  canonical_asset_id uuid,
  work_order_status text,
  review_status text,
  source_report_id uuid
)
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_review public.operational_maintenance_reviews%rowtype;
  v_work_order public.maintenance_work_orders%rowtype;
  v_number text;
  v_description text;
begin
  select * into v_review
  from public.operational_maintenance_reviews
  where id = p_review_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'operational_review_not_found';
  end if;

  if v_review.linked_work_order_id is not null then
    select * into v_work_order
    from public.maintenance_work_orders
    where id = v_review.linked_work_order_id;

    return query
    select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id,
           v_work_order.status, v_review.status, v_review.source_report_id;
    return;
  end if;

  if v_review.status not in ('accepted', 'pending') then
    raise exception 'operational_review_must_be_accepted';
  end if;

  if v_review.status = 'pending' and v_review.review_reason <> 'out_of_service' then
    raise exception 'operational_review_must_be_accepted';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'work_order_title_required';
  end if;

  v_number := 'OT-DRILL-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_review.id::text, '-', ''), 1, 8));
  v_description := concat_ws(E'\n',
    nullif(trim(p_description), ''),
    'Origen: revisión operacional de Sondaje (' || v_review.review_reason || ').',
    'Evidencia: production_drilling_source_reports:' || v_review.source_report_id::text || '.'
  );

  insert into public.maintenance_work_orders (
    organization_id, work_order_number, asset_id, canonical_asset_id, title, description,
    work_type, status, priority, scheduled_date, created_by
  ) values (
    p_organization_id, v_number, v_review.canonical_asset_id, v_review.canonical_asset_id,
    left(trim(p_title), 180), v_description, coalesce(nullif(trim(p_work_type), ''), 'corrective'), 'pending',
    coalesce(nullif(trim(p_priority), ''), 'critical'), p_scheduled_date, p_created_by
  )
  returning * into v_work_order;

  update public.operational_maintenance_reviews
  set status = 'work_order_created',
      linked_work_order_id = v_work_order.id,
      reviewed_by = p_created_by,
      reviewed_at = now(),
      updated_at = now()
  where id = v_review.id;

  return query
  select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id,
         v_work_order.status, 'work_order_created'::text, v_review.source_report_id;
end;
$function$;

comment on function public.create_work_order_from_operational_review(
  uuid, uuid, uuid, text, text, text, date, text
) is 'Creates a maintenance OT from an operational drilling review using the canonical OT prefix.';

commit;
