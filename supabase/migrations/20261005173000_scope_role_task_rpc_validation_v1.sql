-- Keep role-task RPC validation off the monolithic worklist hot path.
-- No canonical data changes. Existing task/action semantics are preserved.

create or replace function public.resolve_role_task(
  p_task_key text,
  p_action_code text,
  p_resolution_note text default null,
  p_linked_work_order_id uuid default null,
  p_next_review_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_cargo uuid;
  v_source_id uuid;
  v_is_owned boolean := false;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  select p.organization_id, p.cargo_id
    into v_org, v_cargo
  from public.auth_profile_identity_links l
  join public.profiles p on p.id = l.profile_id
  where l.auth_user_id = v_user
    and p.status = 'active';

  if v_org is null or v_cargo is null then
    raise exception 'active_profile_with_cargo_required';
  end if;

  select exists (
    select 1
    from public.role_tasks_actionable_v1 t
    where t.organization_id = v_org
      and t.cargo_id = v_cargo
      and t.task_key = p_task_key
      and t.responsibility = 'owner'
  ) into v_is_owned;

  if not v_is_owned then
    raise exception 'task_not_owned_by_current_cargo';
  end if;

  if p_task_key like 'incident:%'
     or p_task_key like 'inspection:%'
     or p_task_key like 'risk:%' then
    begin
      v_source_id := split_part(p_task_key, ':', 2)::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid_hse_source_id';
    end;
  end if;

  if p_task_key like 'incident:%' then
    if not exists (
      select 1
      from public.canonical_hse_incidents_v1 i
      where i.id = v_source_id
        and i.organization_id = v_org
    ) then
      raise exception 'incident_not_tenant_mapped';
    end if;
  elsif p_task_key like 'inspection:%' then
    if not exists (
      select 1
      from public.canonical_hse_inspections_v1 i
      where i.id = v_source_id
        and i.organization_id = v_org
    ) then
      raise exception 'inspection_not_tenant_mapped';
    end if;
  elsif p_task_key like 'risk:%' then
    if not exists (
      select 1
      from public.canonical_hse_risks_v1 r
      where r.id = v_source_id
        and r.organization_id = v_org
    ) then
      raise exception 'risk_not_tenant_mapped';
    end if;
  end if;

  return public.resolve_role_task_legacy_unscoped(
    p_task_key,
    p_action_code,
    p_resolution_note,
    p_linked_work_order_id,
    p_next_review_date
  );
end;
$function$;

create or replace function public.resolve_role_task_legacy_unscoped(
  p_task_key text,
  p_action_code text,
  p_resolution_note text default null,
  p_linked_work_order_id uuid default null,
  p_next_review_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_cargo uuid;
  v_task record;
  v_source_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  select p.organization_id, p.cargo_id
    into v_org, v_cargo
  from public.auth_profile_identity_links l
  join public.profiles p on p.id = l.profile_id
  where l.auth_user_id = v_user
    and p.status = 'active';

  if v_org is null or v_cargo is null then raise exception 'active_profile_with_cargo_required'; end if;

  select * into v_task
  from public.role_tasks_actionable_v1 t
  where t.organization_id = v_org
    and t.cargo_id = v_cargo
    and t.task_key = p_task_key
    and t.responsibility = 'owner'
  limit 1;

  if not found then raise exception 'task_not_owned_by_current_cargo'; end if;
  if nullif(trim(coalesce(p_resolution_note,'')),'') is null then raise exception 'resolution_note_required'; end if;

  v_source_id := split_part(p_task_key, ':', 2)::uuid;

  if p_task_key like 'incident:%' and p_action_code = 'close_incident' then
    select to_jsonb(i) into v_before from public.incidents i where i.id=v_source_id;
    if v_before is null then raise exception 'incident_not_found'; end if;
    if coalesce((v_before->>'root_cause_identified')::boolean,false) is not true then raise exception 'root_cause_required_before_close'; end if;
    update public.incidents set status='cerrado', investigation_status='cerrada', updated_at=now() where id=v_source_id;
    select to_jsonb(i) into v_after from public.incidents i where i.id=v_source_id;

  elsif p_task_key like 'inspection:%' and p_action_code = 'complete_inspection' then
    select to_jsonb(i) into v_before from public.hse_inspections i where i.id=v_source_id;
    if v_before is null then raise exception 'inspection_not_found'; end if;
    update public.hse_inspections
       set status='completada', actual_date=coalesce(actual_date,now()), notes=concat_ws(E'\n', nullif(notes,''), p_resolution_note)
     where id=v_source_id;
    select to_jsonb(i) into v_after from public.hse_inspections i where i.id=v_source_id;

  elsif p_task_key like 'risk:%' and p_action_code = 'review_risk' then
    if p_next_review_date is null or p_next_review_date <= current_date then raise exception 'future_next_review_date_required'; end if;
    select to_jsonb(r) into v_before from public.risk_matrix r where r.id=v_source_id;
    if v_before is null then raise exception 'risk_not_found'; end if;
    update public.risk_matrix
       set last_review_date=current_date, next_review_date=p_next_review_date, updated_at=now()
     where id=v_source_id;
    select to_jsonb(r) into v_after from public.risk_matrix r where r.id=v_source_id;

  elsif p_task_key like 'shipment_review:%' and p_action_code = 'approve_shipment' then
    select to_jsonb(s) into v_before from public.production_concentrate_shipments s where s.id=v_source_id and s.organization_id=v_org;
    if v_before is null then raise exception 'shipment_not_found'; end if;
    update public.production_concentrate_shipments
       set validation_status='valid', validation_notes=concat_ws(E'\n', nullif(validation_notes,''), p_resolution_note), updated_at=now()
     where id=v_source_id and organization_id=v_org and validation_status='review';
    if not found then raise exception 'shipment_not_in_review'; end if;
    select to_jsonb(s) into v_after from public.production_concentrate_shipments s where s.id=v_source_id;

  elsif p_task_key like 'maintenance_review:%' and p_action_code = 'accept_review' then
    select to_jsonb(m) into v_before from public.operational_maintenance_reviews m where m.id=v_source_id and m.organization_id=v_org;
    if v_before is null then raise exception 'maintenance_review_not_found'; end if;
    update public.operational_maintenance_reviews
       set status='accepted', decision_note=p_resolution_note, reviewed_by=v_user, reviewed_at=now(), updated_at=now()
     where id=v_source_id and organization_id=v_org and status='pending';
    if not found then raise exception 'maintenance_review_not_pending'; end if;
    select to_jsonb(m) into v_after from public.operational_maintenance_reviews m where m.id=v_source_id;

  elsif p_task_key like 'maintenance_review:%' and p_action_code = 'link_work_order' then
    if p_linked_work_order_id is null then raise exception 'linked_work_order_required'; end if;
    if not exists(select 1 from public.maintenance_work_orders w where w.id=p_linked_work_order_id and w.organization_id=v_org) then raise exception 'work_order_not_found'; end if;
    select to_jsonb(m) into v_before from public.operational_maintenance_reviews m where m.id=v_source_id and m.organization_id=v_org;
    if v_before is null then raise exception 'maintenance_review_not_found'; end if;
    update public.operational_maintenance_reviews
       set status='work_order_created', linked_work_order_id=p_linked_work_order_id, decision_note=p_resolution_note, reviewed_by=v_user, reviewed_at=now(), updated_at=now()
     where id=v_source_id and organization_id=v_org and status='pending';
    if not found then raise exception 'maintenance_review_not_pending'; end if;
    select to_jsonb(m) into v_after from public.operational_maintenance_reviews m where m.id=v_source_id;

  else
    raise exception 'unsupported_task_action';
  end if;

  insert into public.role_task_resolution_audit(organization_id,auth_user_id,cargo_id,task_key,action_code,resolution_note,source_table,source_id,before_state,after_state)
  values(v_org,v_user,v_cargo,p_task_key,p_action_code,p_resolution_note,
    case
      when p_task_key like 'incident:%' then 'incidents'
      when p_task_key like 'inspection:%' then 'hse_inspections'
      when p_task_key like 'risk:%' then 'risk_matrix'
      when p_task_key like 'shipment_review:%' then 'production_concentrate_shipments'
      when p_task_key like 'maintenance_review:%' then 'operational_maintenance_reviews'
      else 'unknown'
    end,
    v_source_id,v_before,v_after);

  return jsonb_build_object('ok',true,'task_key',p_task_key,'action',p_action_code,'source_id',v_source_id,'after',v_after);
end;
$function$;

create or replace function public.set_my_operational_task_state(
  p_task_key text,
  p_status text,
  p_snoozed_until timestamptz default null
)
returns public.user_action_states
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_cargo uuid;
  v_visible boolean := false;
  v_row public.user_action_states;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_status not in ('pending','read','snoozed') then raise exception 'invalid task state'; end if;
  if p_status='snoozed' and (p_snoozed_until is null or p_snoozed_until<=now()) then raise exception 'future snoozed_until required'; end if;

  select p.organization_id, p.cargo_id
    into v_org, v_cargo
  from public.auth_profile_identity_links l
  join public.profiles p on p.id=l.profile_id
  where l.auth_user_id=v_uid
    and p.status='active'
  limit 1;

  if v_org is null or v_cargo is null then raise exception 'active profile with cargo required'; end if;

  select exists (
    select 1
    from public.role_tasks_actionable_v1 t
    where t.organization_id=v_org
      and t.cargo_id=v_cargo
      and t.task_key=p_task_key
  ) into v_visible;

  if not v_visible then
    select exists (
      select 1
      from public.role_task_escalations_v1 t
      where t.organization_id=v_org
        and t.cargo_id=v_cargo
        and t.task_key=p_task_key
    ) into v_visible;
  end if;

  if not v_visible then raise exception 'task unavailable for current cargo'; end if;

  insert into public.user_action_states(organization_id,user_id,source_key,status,snoozed_until)
  values(v_org,v_uid,p_task_key,p_status,case when p_status='snoozed' then p_snoozed_until else null end)
  on conflict(organization_id,user_id,source_key)
  do update set status=excluded.status,snoozed_until=excluded.snoozed_until,updated_at=now()
  returning * into v_row;

  return v_row;
end
$function$;

create or replace function public.set_role_task_personal_state(
  p_task_key text,
  p_status text,
  p_snoozed_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $function$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_cargo uuid;
  v_visible boolean := false;
  v_state record;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_status not in ('pending','read','snoozed') then raise exception 'invalid_status'; end if;
  if p_status='snoozed' and (p_snoozed_until is null or p_snoozed_until <= now()) then
    raise exception 'future_snooze_time_required';
  end if;

  select p.organization_id,p.cargo_id into v_org,v_cargo
  from public.auth_profile_identity_links l
  join public.profiles p on p.id=l.profile_id
  where l.auth_user_id=v_user and p.status='active';

  if v_org is null or v_cargo is null then raise exception 'active_profile_with_cargo_required'; end if;

  select exists (
    select 1
    from public.role_tasks_actionable_v1 t
    where t.organization_id=v_org
      and t.cargo_id=v_cargo
      and t.task_key=p_task_key
  ) into v_visible;

  if not v_visible then
    select exists (
      select 1
      from public.role_task_escalations_v1 t
      where t.organization_id=v_org
        and t.cargo_id=v_cargo
        and t.task_key=p_task_key
    ) into v_visible;
  end if;

  if not v_visible then raise exception 'task_not_visible_to_current_cargo'; end if;

  insert into public.user_action_states(organization_id,user_id,source_key,status,snoozed_until,created_at,updated_at)
  values(v_org,v_user,p_task_key,p_status,case when p_status='snoozed' then p_snoozed_until else null end,now(),now())
  on conflict(organization_id,user_id,source_key)
  do update set status=excluded.status,snoozed_until=excluded.snoozed_until,updated_at=now()
  returning * into v_state;

  return jsonb_build_object('ok',true,'task_key',p_task_key,'status',v_state.status,'snoozed_until',v_state.snoozed_until);
end;
$function$;

revoke all on function public.resolve_role_task(text, text, text, uuid, date) from public, anon;
grant execute on function public.resolve_role_task(text, text, text, uuid, date) to authenticated, service_role;

revoke all on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date) from public, anon, authenticated;
grant execute on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date) to service_role;

revoke all on function public.set_my_operational_task_state(text, text, timestamptz) from public, anon;
grant execute on function public.set_my_operational_task_state(text, text, timestamptz) to authenticated, service_role;

revoke all on function public.set_role_task_personal_state(text, text, timestamptz) from public, anon;
grant execute on function public.set_role_task_personal_state(text, text, timestamptz) to authenticated, service_role;

comment on function public.resolve_role_task(text, text, text, uuid, date) is
  'Tenant-safe role task resolver validated against scoped actionable tasks; avoids the monolithic worklist hot path.';
comment on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date) is
  'Private compatibility implementation. Ownership validation uses scoped actionable tasks and remains service-role only.';
