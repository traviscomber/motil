begin;

alter table public.maintenance_work_orders
  add column if not exists total_timer_seconds integer not null default 0;

update public.maintenance_work_orders
set total_timer_seconds = greatest(coalesce(total_timer_seconds, 0), coalesce(total_timer_minutes, 0) * 60)
where coalesce(total_timer_minutes, 0) > 0
  and coalesce(total_timer_seconds, 0) < coalesce(total_timer_minutes, 0) * 60;

alter table public.maintenance_work_orders
  drop constraint if exists maintenance_work_orders_total_timer_seconds_check;
alter table public.maintenance_work_orders
  add constraint maintenance_work_orders_total_timer_seconds_check
  check (total_timer_seconds >= 0);

create table if not exists public.work_order_evidence_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  evidence_type text not null default 'photo',
  storage_bucket text not null default 'maintenance-work-order-evidence',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  notes text,
  captured_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint work_order_evidence_files_type_check check (evidence_type in ('photo')),
  constraint work_order_evidence_files_size_check check (size_bytes > 0 and size_bytes <= 12582912),
  constraint work_order_evidence_files_storage_unique unique (storage_bucket, storage_path)
);

create index if not exists work_order_evidence_files_org_work_order_idx
  on public.work_order_evidence_files (organization_id, work_order_id, created_at desc);

alter table public.work_order_evidence_files enable row level security;
revoke all on table public.work_order_evidence_files from anon, authenticated;
grant all on table public.work_order_evidence_files to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-work-order-evidence',
  'maintenance-work-order-evidence',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.update_work_order_timer(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_action text,
  p_actor_id uuid default null,
  p_actor_name text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_now timestamptz := now();
  v_new_status text;
  v_new_start timestamptz;
  v_total_seconds integer;
  v_elapsed_seconds integer := 0;
  v_total_minutes integer;
  v_summary text;
begin
  if p_action not in ('play', 'pause', 'resume', 'terminate') then
    raise exception 'Invalid timer action: %', p_action using errcode = '22023';
  end if;

  select *
    into v_wo
    from public.maintenance_work_orders
   where id = p_work_order_id
     and organization_id = p_organization_id
   for update;

  if not found then
    raise exception 'Work order not found' using errcode = 'P0002';
  end if;

  if p_action in ('play', 'resume') and v_wo.assigned_person_id is null then
    raise exception 'Asigne un responsable antes de iniciar el trabajo' using errcode = '55000';
  end if;

  if p_action in ('play', 'resume')
     and lower(coalesce(v_wo.status, '')) in ('completed', 'closed', 'cancelled', 'canceled') then
    raise exception 'No se puede iniciar trabajo sobre una OT finalizada o cancelada' using errcode = '55000';
  end if;

  v_new_status := coalesce(v_wo.timer_status, 'idle');
  v_new_start := v_wo.timer_start_time;
  v_total_seconds := greatest(
    coalesce(v_wo.total_timer_seconds, 0),
    coalesce(v_wo.total_timer_minutes, 0) * 60
  );

  if p_action = 'play' then
    if v_new_status <> 'idle' then
      raise exception 'Timer can only start from idle' using errcode = '55000';
    end if;
    v_new_status := 'running';
    v_new_start := v_now;
    v_summary := 'Temporizador de trabajo iniciado';
  elsif p_action = 'pause' then
    if v_new_status <> 'running' or v_new_start is null then
      raise exception 'Timer can only pause while running' using errcode = '55000';
    end if;
    v_elapsed_seconds := greatest(0, floor(extract(epoch from (v_now - v_new_start)))::integer);
    v_total_seconds := v_total_seconds + v_elapsed_seconds;
    v_new_status := 'paused';
    v_new_start := null;
    v_summary := 'Temporizador de trabajo pausado';
  elsif p_action = 'resume' then
    if v_new_status <> 'paused' then
      raise exception 'Timer can only resume from paused' using errcode = '55000';
    end if;
    v_new_status := 'running';
    v_new_start := v_now;
    v_summary := 'Temporizador de trabajo reanudado';
  elsif p_action = 'terminate' then
    if v_new_status not in ('running', 'paused') then
      raise exception 'Timer can only terminate while running or paused' using errcode = '55000';
    end if;
    if v_new_status = 'running' and v_new_start is not null then
      v_elapsed_seconds := greatest(0, floor(extract(epoch from (v_now - v_new_start)))::integer);
      v_total_seconds := v_total_seconds + v_elapsed_seconds;
    end if;
    v_new_status := 'idle';
    v_new_start := null;
    v_summary := 'Temporizador de trabajo finalizado';
  end if;

  v_total_minutes := floor(v_total_seconds::numeric / 60)::integer;

  update public.maintenance_work_orders
     set timer_status = v_new_status,
         timer_start_time = v_new_start,
         total_timer_seconds = v_total_seconds,
         total_timer_minutes = v_total_minutes,
         actual_duration_hours = v_total_seconds::numeric / 3600,
         updated_at = v_now
   where id = p_work_order_id
     and organization_id = p_organization_id;

  insert into public.work_order_events (
    organization_id,
    work_order_id,
    canonical_asset_id,
    event_type,
    event_at,
    actor_id,
    actor_name,
    source_table,
    source_record_id,
    summary,
    payload
  ) values (
    p_organization_id,
    p_work_order_id,
    v_wo.canonical_asset_id,
    'timer_' || p_action,
    v_now,
    p_actor_id,
    nullif(trim(coalesce(p_actor_name, '')), ''),
    'public.maintenance_work_orders',
    p_work_order_id::text,
    v_summary,
    jsonb_build_object(
      'action', p_action,
      'previous_status', coalesce(v_wo.timer_status, 'idle'),
      'new_status', v_new_status,
      'elapsed_seconds', v_elapsed_seconds,
      'total_seconds', v_total_seconds,
      'elapsed_minutes', floor(v_elapsed_seconds::numeric / 60)::integer,
      'total_minutes', v_total_minutes,
      'notes', nullif(trim(coalesce(p_notes, '')), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'action', p_action,
    'timer_status', v_new_status,
    'timer_start_time', v_new_start,
    'total_seconds', v_total_seconds,
    'total_minutes', v_total_minutes,
    'total_hours', round((v_total_seconds::numeric / 3600), 3)
  );
end;
$function$;

revoke all on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) to service_role;

comment on table public.work_order_evidence_files is
  'Private, tenant-scoped field evidence for maintenance work-order execution and closure.';

commit;
