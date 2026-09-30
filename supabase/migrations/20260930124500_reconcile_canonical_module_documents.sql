begin;

alter table public.module_documents
  add column if not exists organization_id uuid references public.organizations(id),
  add column if not exists provenance_status text not null default 'operational',
  add column if not exists canonical_role text,
  add column if not exists canonicalized_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'module_documents_provenance_status_check'
      and conrelid = 'public.module_documents'::regclass
  ) then
    alter table public.module_documents
      add constraint module_documents_provenance_status_check
      check (provenance_status in ('operational','canonical','candidate','supporting'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'module_documents_canonical_role_check'
      and conrelid = 'public.module_documents'::regclass
  ) then
    alter table public.module_documents
      add constraint module_documents_canonical_role_check
      check (canonical_role is null or canonical_role in ('canonical','supporting','plan_only'));
  end if;
end $$;

update public.module_documents md
set organization_id = resolved.organization_id
from (
  select ur.user_id, (min(ur.organization_id::text))::uuid as organization_id
  from public.user_roles ur
  group by ur.user_id
  having count(distinct ur.organization_id) = 1
) resolved
where md.uploaded_by = resolved.user_id
  and md.organization_id is null;

update public.module_documents
set provenance_status = 'canonical',
    canonical_role = 'canonical',
    canonicalized_at = coalesce(canonicalized_at, now()),
    status = 'active'
where module = 'prevención'
  and category = 'documentos-hse'
  and is_active is true
  and organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

create index if not exists idx_module_documents_organization_module
  on public.module_documents (organization_id, module, category)
  where deleted_at is null;

drop policy if exists module_documents_org_isolation on public.module_documents;
create policy module_documents_org_isolation
on public.module_documents
for all
to authenticated
using (
  (
    organization_id is not null
    and organization_id in (
      select ur.organization_id
      from public.user_roles ur
      where ur.user_id = (select current_application_user_id())
    )
  )
  or (
    organization_id is null
    and (
      exists (
        select 1
        from public.maintenance_assets a
        where a.id = module_documents.asset_id
          and a.organization_id in (
            select ur.organization_id
            from public.user_roles ur
            where ur.user_id = (select current_application_user_id())
          )
      )
      or exists (
        select 1
        from public.user_roles owner_role
        join public.user_roles viewer_role
          on viewer_role.organization_id = owner_role.organization_id
        where owner_role.user_id = module_documents.uploaded_by
          and viewer_role.user_id = (select current_application_user_id())
      )
    )
  )
)
with check (
  (
    organization_id is not null
    and organization_id in (
      select ur.organization_id
      from public.user_roles ur
      where ur.user_id = (select current_application_user_id())
    )
  )
  or (
    organization_id is null
    and (
      exists (
        select 1
        from public.maintenance_assets a
        where a.id = module_documents.asset_id
          and a.organization_id in (
            select ur.organization_id
            from public.user_roles ur
            where ur.user_id = (select current_application_user_id())
          )
      )
      or exists (
        select 1
        from public.user_roles owner_role
        join public.user_roles viewer_role
          on viewer_role.organization_id = owner_role.organization_id
        where owner_role.user_id = module_documents.uploaded_by
          and viewer_role.user_id = (select current_application_user_id())
      )
    )
  )
);

commit;
