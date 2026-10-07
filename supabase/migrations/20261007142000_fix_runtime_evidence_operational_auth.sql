create or replace function public.record_work_order_runtime_evidence_v1(
  p_work_order_id uuid,
  p_meter_hours numeric default null::numeric,
  p_recorded_at timestamp with time zone default now(),
  p_unavailable_reason text default null::text,
  p_notes text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_actor uuid;
  v_reading_id uuid;
  v_evidence_id uuid;
  v_authorized boolean := false;
begin
  select *
  into v_wo
  from public.maintenance_work_orders
  where id = p_work_order_id
  for update;

  if not found then
    raise exception 'Orden no encontrada';
  end if;

  if v_wo.canonical_asset_id is null then
    raise exception 'La orden no tiene activo canónico';
  end if;

  if v_wo.status = 'completed' then
    raise exception 'La orden ya está cerrada';
  end if;

  v_actor := public.current_application_user_id();
  if v_actor is null then
    raise exception 'Sin permisos';
  end if;

  select (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = v_actor
        and ur.organization_id = v_wo.organization_id
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = v_actor
        and p.organization_id = v_wo.organization_id
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
      where pe.organization_id = v_wo.organization_id
        and pe.profile_id = v_actor
        and pe.employment_status = 'active'
        and pe.id = v_wo.assigned_person_id
    )
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception 'Sin permisos';
  end if;

  if p_meter_hours is not null then
    if p_meter_hours < 0 then
      raise exception 'El horómetro no puede ser negativo';
    end if;

    insert into public.asset_runtime_readings(
      organization_id,
      canonical_asset_id,
      meter_hours,
      recorded_at,
      source_type,
      source_reference,
      notes,
      recorded_by
    )
    values(
      v_wo.organization_id,
      v_wo.canonical_asset_id,
      p_meter_hours,
      coalesce(p_recorded_at, now()),
      'manual',
      'work_order_close:' || p_work_order_id::text,
      p_notes,
      v_actor
    )
    returning id into v_reading_id;

    insert into public.work_order_runtime_evidence(
      organization_id,
      work_order_id,
      canonical_asset_id,
      evidence_status,
      runtime_reading_id,
      unavailable_reason,
      notes,
      recorded_by,
      recorded_at,
      updated_at
    )
    values(
      v_wo.organization_id,
      p_work_order_id,
      v_wo.canonical_asset_id,
      'meter_reading',
      v_reading_id,
      null,
      p_notes,
      v_actor,
      now(),
      now()
    )
    on conflict (work_order_id) do update
    set canonical_asset_id = excluded.canonical_asset_id,
        evidence_status = 'meter_reading',
        runtime_reading_id = excluded.runtime_reading_id,
        unavailable_reason = null,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by,
        recorded_at = excluded.recorded_at,
        updated_at = now()
    returning id into v_evidence_id;
  else
    if nullif(trim(coalesce(p_unavailable_reason, '')), '') is null then
      raise exception 'Indica por qué el horómetro no está disponible';
    end if;

    insert into public.work_order_runtime_evidence(
      organization_id,
      work_order_id,
      canonical_asset_id,
      evidence_status,
      runtime_reading_id,
      unavailable_reason,
      notes,
      recorded_by,
      recorded_at,
      updated_at
    )
    values(
      v_wo.organization_id,
      p_work_order_id,
      v_wo.canonical_asset_id,
      'not_available',
      null,
      trim(p_unavailable_reason),
      p_notes,
      v_actor,
      now(),
      now()
    )
    on conflict (work_order_id) do update
    set canonical_asset_id = excluded.canonical_asset_id,
        evidence_status = 'not_available',
        runtime_reading_id = null,
        unavailable_reason = excluded.unavailable_reason,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by,
        recorded_at = excluded.recorded_at,
        updated_at = now()
    returning id into v_evidence_id;
  end if;

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
    v_wo.organization_id,
    p_work_order_id,
    v_wo.canonical_asset_id,
    'runtime_evidence_recorded',
    v_actor,
    'work_order_runtime_evidence',
    v_evidence_id::text,
    'Evidencia de horómetro registrada para cierre',
    jsonb_build_object(
      'status', case when v_reading_id is null then 'not_available' else 'meter_reading' end,
      'runtime_reading_id', v_reading_id
    )
  );

  return v_evidence_id;
end;
$function$;

revoke all on function public.record_work_order_runtime_evidence_v1(uuid,numeric,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.record_work_order_runtime_evidence_v1(uuid,numeric,timestamptz,text,text) to service_role;
