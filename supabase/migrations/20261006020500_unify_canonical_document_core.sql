begin;

-- Motil rule: an uploaded source document is accepted canonical evidence.
-- Workflow approvals remain separate operational events; they do not downgrade source truth.
update public.module_documents
set organization_id = coalesce(organization_id, '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid),
    status = 'active',
    is_active = true,
    provenance_status = 'canonical',
    canonical_role = 'canonical',
    canonicalized_at = coalesce(canonicalized_at, uploaded_at, created_at, now())
where deleted_at is null;

update public.documents d
set organization_id = md.organization_id,
    scope = coalesce(d.scope, 'module'),
    module = md.module,
    category = md.category,
    title = md.document_name,
    description = md.description,
    document_type = md.document_type,
    status = 'approved',
    current_file_path = md.file_path,
    current_file_url = md.file_path,
    file_name = coalesce(d.file_name, md.document_name),
    file_size_bytes = coalesce(d.file_size_bytes, md.file_size_bytes),
    file_mime_type = coalesce(d.file_mime_type, md.mime_type),
    valid_from = coalesce(d.valid_from, md.valid_from),
    valid_until = coalesce(d.valid_until, md.valid_until),
    effective_date = coalesce(d.effective_date, md.valid_from),
    expiry_date = coalesce(d.expiry_date, md.valid_until),
    approved_at = coalesce(d.approved_at, md.canonicalized_at, md.uploaded_at, md.created_at, now()),
    search_text = trim(concat_ws(' ', md.document_name, md.description, md.module, md.category, md.document_type_category)),
    metadata = coalesce(d.metadata, '{}'::jsonb) || jsonb_build_object(
      'source_table', 'module_documents',
      'source_id', md.id,
      'provenance_status', 'canonical',
      'canonical_role', 'canonical'
    ),
    updated_at = now()
from public.module_documents md
where d.id = md.id
  and md.deleted_at is null;

insert into public.documents (
  id, organization_id, scope, module, category, title, description, document_type,
  status, current_file_path, current_file_url, file_name, file_size_bytes,
  file_mime_type, valid_from, valid_until, effective_date, expiry_date,
  created_by, created_at, updated_at, approved_at, search_text, metadata
)
select
  md.id, md.organization_id, 'module', md.module, md.category, md.document_name,
  md.description, md.document_type, 'approved', md.file_path, md.file_path,
  md.document_name, md.file_size_bytes, md.mime_type, md.valid_from, md.valid_until,
  md.valid_from, md.valid_until, md.uploaded_by, coalesce(md.created_at, md.uploaded_at, now()),
  now(), coalesce(md.canonicalized_at, md.uploaded_at, md.created_at, now()),
  trim(concat_ws(' ', md.document_name, md.description, md.module, md.category, md.document_type_category)),
  jsonb_build_object('source_table','module_documents','source_id',md.id,'provenance_status','canonical','canonical_role','canonical')
from public.module_documents md
where md.deleted_at is null
  and not exists (select 1 from public.documents d where d.id = md.id);

create or replace function public.sync_module_document_to_documents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  new.status := 'active';
  new.is_active := true;
  new.provenance_status := 'canonical';
  new.canonical_role := 'canonical';
  new.canonicalized_at := coalesce(new.canonicalized_at, new.uploaded_at, new.created_at, now());

  insert into public.documents (
    id, organization_id, scope, module, category, title, description, document_type,
    status, current_file_path, current_file_url, file_name, file_size_bytes,
    file_mime_type, valid_from, valid_until, effective_date, expiry_date,
    created_by, created_at, updated_at, approved_at, search_text, metadata
  ) values (
    new.id, new.organization_id, 'module', new.module, new.category, new.document_name,
    new.description, new.document_type, 'approved', new.file_path, new.file_path,
    new.document_name, new.file_size_bytes, new.mime_type, new.valid_from, new.valid_until,
    new.valid_from, new.valid_until, new.uploaded_by, coalesce(new.created_at, new.uploaded_at, now()),
    now(), new.canonicalized_at,
    trim(concat_ws(' ', new.document_name, new.description, new.module, new.category, new.document_type_category)),
    jsonb_build_object('source_table','module_documents','source_id',new.id,'provenance_status','canonical','canonical_role','canonical')
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    scope = excluded.scope,
    module = excluded.module,
    category = excluded.category,
    title = excluded.title,
    description = excluded.description,
    document_type = excluded.document_type,
    status = 'approved',
    current_file_path = excluded.current_file_path,
    current_file_url = excluded.current_file_url,
    file_name = excluded.file_name,
    file_size_bytes = excluded.file_size_bytes,
    file_mime_type = excluded.file_mime_type,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    effective_date = excluded.effective_date,
    expiry_date = excluded.expiry_date,
    approved_at = coalesce(public.documents.approved_at, excluded.approved_at),
    search_text = excluded.search_text,
    metadata = coalesce(public.documents.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_module_document_canonical_projection on public.module_documents;
create trigger sync_module_document_canonical_projection
before insert or update of
  organization_id, module, category, document_name, description, document_type,
  document_type_category, file_path, file_size_bytes, mime_type, valid_from,
  valid_until, status, is_active, provenance_status, canonical_role,
  canonicalized_at, deleted_at
on public.module_documents
for each row
execute function public.sync_module_document_to_documents();

commit;
