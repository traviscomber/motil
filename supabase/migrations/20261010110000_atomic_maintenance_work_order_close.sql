-- Atomic close: timer, reported hours, diagnosis and closure share one transaction.
-- Existing close_work_order_safely remains the final authorization and evidence gate.
create or replace function public.close_work_order_atomically(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_actor_id uuid,
  p_actual_duration_hours numeric,
  p_root_cause text,
  p_preventive_actions text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_timer_seconds bigint;
  v_hours numeric;
begin
  if p_actor_id is null or p_actor_id is distinct from public.current_application_user_id() then
    raise exception 'Sin permisos' using errcode = '42501';
  end if;
  select * into v_wo from public.maintenance_work_orders
    where id = p_work_order_id and organization_id = p_organization_id for update;
  if not found then
    raise exception 'Orden no encontrada' using errcode = 'P0002';
  end if;
  if v_wo.status in ('completed', 'closed', 'cancelled', 'canceled') then
    raise exception 'La orden ya está finalizada' using errcode = '55000';
  end if;

  -- Timer termination is rolled back if any later closure check fails.
  if v_wo.timer_status in ('running', 'paused') then
    perform public.update_work_order_timer(
      p_organization_id, p_work_order_id, 'terminate', p_actor_id, null, 'Cierre de OT'
    );
  end if;
  select * into v_wo from public.maintenance_work_orders
    where id = p_work_order_id and organization_id = p_organization_id;
  v_timer_seconds := greatest(coalesce(v_wo.total_timer_seconds, 0), coalesce(v_wo.total_timer_minutes, 0) * 60);
  if p_actual_duration_hours is not null and (p_actual_duration_hours <= 0 or p_actual_duration_hours > 100000) then
    raise exception 'Horas de trabajo inválidas' using errcode = '22023';
  end if;
  v_hours := greatest(coalesce(p_actual_duration_hours, 0), coalesce(v_wo.actual_duration_hours, 0), v_timer_seconds::numeric / 3600);
  update public.maintenance_work_orders set
    actual_duration_hours = v_hours,
    root_cause = coalesce(p_root_cause, root_cause),
    preventive_actions = coalesce(p_preventive_actions, preventive_actions),
    updated_at = now()
  where organization_id = p_organization_id and id = p_work_order_id;

  -- Any exception undoes the timer event, hours and metadata update.
  return public.close_work_order_safely(p_work_order_id);
end;
$function$;
revoke all on function public.close_work_order_atomically(uuid,uuid,uuid,numeric,text,text) from public, anon, authenticated;
grant execute on function public.close_work_order_atomically(uuid,uuid,uuid,numeric,text,text) to service_role;
