create table if not exists public.eecc_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  eecc_id uuid not null references public.eecc(id) on delete cascade,
  document_type text not null,
  status text not null default 'sin_registro',
  approved_on date null,
  source text null,
  source_note text null,
  source_ref text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eecc_compliance_documents_type_check
    check (document_type in ('F30', 'F30-1')),
  constraint eecc_compliance_documents_status_check
    check (status in ('sin_registro', 'pendiente', 'aprobado', 'rechazado', 'vencido')),
  constraint eecc_compliance_documents_unique
    unique (organization_id, eecc_id, document_type)
);

create index if not exists idx_eecc_compliance_documents_org
  on public.eecc_compliance_documents (organization_id, eecc_id);
