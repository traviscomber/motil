-- Preserve the human acceptance gate for non-critical drilling reviews while
-- allowing acceptance + WO creation to happen atomically from the server API.

create or replace function public.accept_and_create_work_order_from_operational_review_v1(
  p_organization_id uuid,
  p_review_id uuid,
  p_created_by uuid,
  p_title text,
  p_work_type text default null,
  p_priority text default null,
  p_scheduled_date date default null,
  p_description text default null
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
begin
  select *
  into v_review
  from public.operational_maintenance_reviews
  where id = p_review_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'operational_review_not_found';
  end if;

  if v_review.linked_work_order_id is not null then
    return query
    select *
    from public.create_work_order_from_operational_review(
      p_organization_id,
      p_review_id,
      p_created_by,
      p_title,
      p_work_type,
      p_priority,
      p_scheduled_date,
      p_description
    );
    return;
  end if;

  if v_review.status = 'pending' then
    update public.operational_maintenance_reviews
    set status = 'accepted',
        reviewed_by = p_created_by,
        reviewed_at = now(),
        updated_at = now()
    where id = v_review.id;
  elsif v_review.status <> 'accepted' then
    raise exception 'operational_review_must_be_pending_or_accepted';
  end if;

  return query
  select *
  from public.create_work_order_from_operational_review(
    p_organization_id,
    p_review_id,
    p_created_by,
    p_title,
    p_work_type,
    p_priority,
    p_scheduled_date,
    p_description
  );
end;
$function$;

revoke all on function public.accept_and_create_work_order_from_operational_review_v1(
  uuid, uuid, uuid, text, text, text, date, text
) from public;
revoke execute on function public.accept_and_create_work_order_from_operational_review_v1(
  uuid, uuid, uuid, text, text, text, date, text
) from anon, authenticated;
grant execute on function public.accept_and_create_work_order_from_operational_review_v1(
  uuid, uuid, uuid, text, text, text, date, text
) to service_role;
