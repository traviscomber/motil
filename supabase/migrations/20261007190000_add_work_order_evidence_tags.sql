begin;

alter table public.work_order_evidence_files
  add column if not exists evidence_tag text not null default 'general';

alter table public.work_order_evidence_files
  drop constraint if exists work_order_evidence_files_tag_check;

alter table public.work_order_evidence_files
  add constraint work_order_evidence_files_tag_check
  check (evidence_tag in ('before', 'during', 'completed', 'general'));

comment on column public.work_order_evidence_files.evidence_tag is
  'Operational tag for maintenance photo context: before, during, completed, or general. Existing evidence remains general.';

commit;
