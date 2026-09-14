-- Defense-in-depth for HSE task resolution.
-- The operational worklist already derives HSE tasks from tenant-scoped canonical views,
-- but the resolver historically mutated legacy source rows by id only. Preserve the
-- existing behavior behind a private function and require canonical tenant membership
-- before any authenticated HSE mutation can reach it.

alter function public.resolve_role_task(text, text, text, uuid, date)
  rename to resolve_role_task_legacy_unscoped;

revoke all on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date)
  from public, anon, authenticated;
grant execute on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date)
  to service_role;

create function public.resolve_role_task(
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
    from public.role_task_worklist_v1 t
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

revoke all on function public.resolve_role_task(text, text, text, uuid, date)
  from public, anon;
grant execute on function public.resolve_role_task(text, text, text, uuid, date)
  to authenticated, service_role;

comment on function public.resolve_role_task(text, text, text, uuid, date) is
  'Tenant-safe role task resolver. HSE mutations require current owned task plus canonical organization mapping before legacy source mutation.';
comment on function public.resolve_role_task_legacy_unscoped(text, text, text, uuid, date) is
  'Private implementation retained for compatibility. Do not grant to authenticated clients; invoke only through resolve_role_task tenant guard.';
