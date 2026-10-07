-- Ensure every active canonical profile has the tenant membership row expected
-- by server-side RLS/RPC authorization. Imported operational profiles may
-- already be valid in profiles/people while lacking user_roles.
insert into public.user_roles (user_id, organization_id, role, assigned_by)
select
  p.id,
  p.organization_id,
  coalesce(nullif(btrim(p.role), ''), 'viewer'),
  null
from public.profiles p
where p.status = 'active'
  and p.organization_id is not null
on conflict (user_id, organization_id) do nothing;

create or replace function public.ensure_active_profile_user_role_membership()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.status = 'active' and new.organization_id is not null then
    insert into public.user_roles (
      user_id,
      organization_id,
      role,
      assigned_by
    ) values (
      new.id,
      new.organization_id,
      coalesce(nullif(btrim(new.role), ''), 'viewer'),
      null
    )
    on conflict (user_id, organization_id) do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_profiles_ensure_user_role_membership on public.profiles;
create trigger trg_profiles_ensure_user_role_membership
after insert or update of status, organization_id, role
on public.profiles
for each row
execute function public.ensure_active_profile_user_role_membership();

comment on function public.ensure_active_profile_user_role_membership() is
  'Keeps active application profiles represented in user_roles so service-role RPCs and RLS resolve tenant membership consistently.';
