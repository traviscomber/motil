-- Expand maintenance work-order audit trail.
-- Every meaningful mutation is appended to work_order_events by the database trigger,
-- so API, RPC and future write paths share the same traceability contract.

create or replace function public.log_work_order_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor_id uuid := public.current_application_user_id();
  v_actor_name text;
begin
  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''))
    into v_actor_name
  from public.profiles p
  where p.id = v_actor_id
    and p.organization_id = coalesce(new.organization_id, old.organization_id)
  limit 1;

  if tg_op = 'INSERT' then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id,
      event_type, actor_id, actor_name, source_table, source_record_id,
      summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id,
      'work_order_created', v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Orden de trabajo creada',
      jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'title', new.title,
        'work_type', new.work_type,
        'assigned_person_id', new.assigned_person_id,
        'assigned_to_name', new.assigned_to_name,
        'cost_center_id', new.cost_center_id,
        'scheduled_date', new.scheduled_date
      )
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'status_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      case when new.status = 'completed' then 'Orden de trabajo cerrada' else 'Estado de OT actualizado' end,
      jsonb_build_object('field', 'status', 'from', old.status, 'to', new.status)
    );
  end if;

  if new.assigned_person_id is distinct from old.assigned_person_id then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'assignee_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Responsable de OT actualizado',
      jsonb_build_object(
        'field', 'assigned_person_id',
        'from', old.assigned_person_id,
        'to', new.assigned_person_id,
        'from_name', old.assigned_to_name,
        'to_name', new.assigned_to_name
      )
    );
  end if;

  if new.priority is distinct from old.priority then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'priority_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Prioridad de OT actualizada',
      jsonb_build_object('field', 'priority', 'from', old.priority, 'to', new.priority)
    );
  end if;

  if new.cost_center_id is distinct from old.cost_center_id then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'cost_center_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Centro de costo de OT actualizado',
      jsonb_build_object('field', 'cost_center_id', 'from', old.cost_center_id, 'to', new.cost_center_id)
    );
  end if;

  if new.scheduled_date is distinct from old.scheduled_date then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'schedule_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Fecha planificada de OT actualizada',
      jsonb_build_object('field', 'scheduled_date', 'from', old.scheduled_date, 'to', new.scheduled_date)
    );
  end if;

  if new.work_type is distinct from old.work_type then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'work_type_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Tipo de trabajo actualizado',
      jsonb_build_object('field', 'work_type', 'from', old.work_type, 'to', new.work_type)
    );
  end if;

  if new.planned_duration_hours is distinct from old.planned_duration_hours then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'planned_hours_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Horas planificadas de OT actualizadas',
      jsonb_build_object('field', 'planned_duration_hours', 'from', old.planned_duration_hours, 'to', new.planned_duration_hours)
    );
  end if;

  if new.actual_duration_hours is distinct from old.actual_duration_hours then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'actual_hours_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Horas reales de OT actualizadas',
      jsonb_build_object('field', 'actual_duration_hours', 'from', old.actual_duration_hours, 'to', new.actual_duration_hours)
    );
  end if;

  if new.root_cause is distinct from old.root_cause then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'root_cause_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Causa raíz de OT actualizada',
      jsonb_build_object('field', 'root_cause', 'from', old.root_cause, 'to', new.root_cause)
    );
  end if;

  if new.preventive_actions is distinct from old.preventive_actions then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'preventive_actions_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Acciones preventivas de OT actualizadas',
      jsonb_build_object('field', 'preventive_actions', 'from', old.preventive_actions, 'to', new.preventive_actions)
    );
  end if;

  if new.meter_reading is distinct from old.meter_reading
     or new.meter_unit is distinct from old.meter_unit then
    insert into public.work_order_events (
      organization_id, work_order_id, canonical_asset_id, event_type,
      actor_id, actor_name, source_table, source_record_id, summary, payload
    ) values (
      new.organization_id, new.id, new.canonical_asset_id, 'meter_changed',
      v_actor_id, v_actor_name, 'maintenance_work_orders', new.id::text,
      'Lectura operacional de OT actualizada',
      jsonb_build_object(
        'field', 'meter',
        'from_reading', old.meter_reading,
        'to_reading', new.meter_reading,
        'from_unit', old.meter_unit,
        'to_unit', new.meter_unit
      )
    );
  end if;

  return new;
end;
$function$;

comment on function public.log_work_order_change() is
  'Append-only OT lifecycle audit: creation plus meaningful field changes with actor, timestamp, source and before/after payload.';
