create or replace function public.complete_work_order_standard_plan_step_v1(
  p_work_order_id uuid,
  p_plan_step_id uuid,
  p_observation text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid;
  v_org uuid;
  v_application uuid;
  v_id uuid;
  v_asset uuid;
  v_assigned_person_id uuid;
  v_authorized boolean := false;
begin
  v_actor := public.current_application_user_id();

  select organization_id, canonical_asset_id, assigned_person_id
    into v_org, v_asset, v_assigned_person_id
  from public.maintenance_work_orders
  where id = p_work_order_id;

  if not found then
    raise exception 'Orden no encontrada';
  end if;

  if v_actor is null then
    raise exception 'Sin permisos';
  end if;

  select (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = v_actor
        and ur.organization_id = v_org
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor
        and p.organization_id = v_org
        and lower(coalesce(p.status, 'active')) = 'active'
        and (
          lower(coalesce(p.role, '')) in ('superadmin','admin','manager','operaciones-supervisor','jefe_mantencion')
          or exists (
            select 1
            from public.role_matrix rm
            where rm.cargo_id = p.cargo_id
              and rm.module_key = 'mant_operaciones'
              and rm.access_level = 'ED'
          )
        )
    )
    or exists (
      select 1
      from public.people pe
      where pe.organization_id = v_org
        and pe.profile_id = v_actor
        and pe.employment_status = 'active'
        and pe.id = v_assigned_person_id
    )
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception 'Sin permisos';
  end if;

  select a.id
    into v_application
  from public.maintenance_standard_job_plan_applications a
  join public.maintenance_standard_job_plans p
    on p.id = a.plan_id
   and p.organization_id = a.organization_id
  join public.maintenance_standard_job_plan_steps s
    on s.plan_id = p.id
   and s.organization_id = a.organization_id
  where a.organization_id = v_org
    and a.work_order_id = p_work_order_id
    and a.status = 'active'
    and p.status = 'approved'
    and s.id = p_plan_step_id
  limit 1;

  if v_application is null then
    raise exception 'El paso no pertenece al plan estándar activo de esta OT';
  end if;

  insert into public.work_order_standard_plan_step_executions(
    organization_id,
    work_order_id,
    plan_application_id,
    plan_step_id,
    status,
    observation,
    completed_by,
    completed_at
  )
  values(
    v_org,
    p_work_order_id,
    v_application,
    p_plan_step_id,
    'completed',
    nullif(trim(coalesce(p_observation, '')), ''),
    v_actor,
    now()
  )
  on conflict(plan_application_id, plan_step_id)
  do update set
    observation = excluded.observation,
    completed_by = excluded.completed_by,
    completed_at = excluded.completed_at
  returning id into v_id;

  insert into public.work_order_events(
    organization_id,
    work_order_id,
    canonical_asset_id,
    event_type,
    actor_id,
    source_table,
    source_record_id,
    summary,
    payload
  )
  values(
    v_org,
    p_work_order_id,
    v_asset,
    'standard_plan_step_completed',
    v_actor,
    'maintenance_standard_job_plan_steps',
    p_plan_step_id::text,
    'Paso de plan estándar realizado',
    jsonb_build_object(
      'plan_step_id', p_plan_step_id,
      'observation', nullif(trim(coalesce(p_observation, '')), ''),
      'completed_at', now()
    )
  );

  return v_id;
end;
$function$;

revoke all on function public.complete_work_order_standard_plan_step_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.complete_work_order_standard_plan_step_v1(uuid,uuid,text) to service_role;
