-- Close preventive OT without inventing a root cause or corrective action.
-- Keep all other closure checks, authorization, costs, and inventory deferral unchanged.
-- Captured from current production function on 2026-10-10.
CREATE OR REPLACE FUNCTION public.close_work_order_safely(p_work_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_cost record;
  v_sequence integer;
  v_actor uuid;
  v_runtime_evidence_status text := null;
  v_runtime_reading_id uuid := null;
  v_has_runtime_evidence boolean := false;
  v_pending_plan_steps integer;
  v_authorized boolean := false;
begin
  select * into v_wo
  from public.maintenance_work_orders
  where id = p_work_order_id
  for update;

  if not found then
    raise exception 'Orden no encontrada';
  end if;

  v_actor := public.current_application_user_id();
  if v_actor is null then
    raise exception 'Sin permisos';
  end if;

  select (
    exists (
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

  if v_wo.status = 'completed' then
    raise exception 'La orden ya está cerrada';
  end if;
  if v_wo.canonical_asset_id is null then
    raise exception 'La orden no puede cerrarse sin equipo asociado';
  end if;
  if lower(coalesce(v_wo.work_type, '')) not in ('preventive', 'preventivo') and coalesce(trim(v_wo.root_cause), '') = '' then
    raise exception 'Registra la causa principal antes de cerrar';
  end if;
  if lower(coalesce(v_wo.work_type, '')) not in ('preventive', 'preventivo') and coalesce(trim(v_wo.preventive_actions), '') = '' then
    raise exception 'Registra la acción preventiva antes de cerrar';
  end if;
  if coalesce(v_wo.actual_duration_hours, 0) <= 0 then
    raise exception 'Registra las horas reales antes de cerrar';
  end if;

  select count(*) into v_pending_plan_steps
  from public.work_order_standard_plan_execution_v1
  where organization_id = v_wo.organization_id
    and work_order_id = p_work_order_id
    and execution_status = 'pending';

  if v_pending_plan_steps > 0 then
    raise exception 'Completa todos los pasos del plan estándar antes de cerrar la OT';
  end if;

  select re.evidence_status, re.runtime_reading_id
  into v_runtime_evidence_status, v_runtime_reading_id
  from public.work_order_runtime_evidence re
  where re.organization_id = v_wo.organization_id
    and re.work_order_id = p_work_order_id;

  v_has_runtime_evidence := found;

  if lower(coalesce(v_wo.work_type, '')) in ('correctivo','corrective') and not v_has_runtime_evidence then
    raise exception 'Registra el horómetro o documenta por qué no está disponible antes de cerrar';
  end if;

  select * into v_cost
  from public.work_order_final_cost_v1
  where organization_id = v_wo.organization_id
    and work_order_id = p_work_order_id;

  -- El cierre tecnico no confirma instalacion ni regulariza stock, materiales o compras.
  -- La instalacion se confirma explicitamente en la aprobacion posterior.
  if coalesce(v_cost.pending_external_services, 0) > 0 then
    raise exception 'Hay servicios externos pendientes de aprobación';
  end if;
  if coalesce(v_cost.open_labor_entries, 0) > 0 then
    raise exception 'Hay registros de trabajo aún abiertos';
  end if;
  if coalesce(v_cost.external_cost_conflict, false) then
    raise exception 'El costo externo está duplicado entre el campo legado y servicios externos; reconcilie antes de cerrar';
  end if;

  select coalesce(max(closure_sequence), 0) + 1 into v_sequence
  from public.work_order_closure_cost_snapshots
  where work_order_id = p_work_order_id;

  insert into public.work_order_closure_cost_snapshots(
    organization_id, work_order_id, closure_sequence, canonical_asset_id, cost_center_id,
    parts_cost, labor_cost, external_services_cost, legacy_external_cost, effective_external_cost,
    procurement_received_cost, procurement_currency, procurement_currency_count, total_cost,
    external_cost_basis, closed_by, closed_at
  ) values (
    v_wo.organization_id, p_work_order_id, v_sequence, v_wo.canonical_asset_id, v_wo.cost_center_id,
    coalesce(v_cost.parts_cost, 0), coalesce(v_cost.labor_cost, 0), coalesce(v_cost.external_services_cost, 0),
    coalesce(v_cost.legacy_external_cost, 0), coalesce(v_cost.effective_external_cost, 0), v_cost.procurement_received_cost,
    v_cost.procurement_currency, coalesce(v_cost.procurement_currency_count, 0), coalesce(v_cost.total_cost, 0),
    v_cost.external_cost_basis, v_actor, now()
  );

  update public.maintenance_work_orders
  set status = 'completed',
      completion_date = now(),
      closed_at = now(),
      closed_by = v_actor,
      updated_at = now()
  where id = p_work_order_id;

  -- Dejar intactos abastecimiento, compras y movimientos de bodega;
  -- el cierre de ejecucion nunca equivale a una conciliacion.
  insert into public.work_order_events(
    organization_id, work_order_id, canonical_asset_id, event_type, actor_id,
    source_table, source_record_id, summary, payload
  ) values (
    v_wo.organization_id, p_work_order_id, v_wo.canonical_asset_id, 'work_order_closed', v_actor,
    'maintenance_work_orders', p_work_order_id::text, 'Orden cerrada con costo final trazable',
    jsonb_build_object(
      'closed_at', now(),
      'closure_sequence', v_sequence,
      'cost_center_id', v_wo.cost_center_id,
      'parts_cost', coalesce(v_cost.parts_cost, 0),
      'labor_cost', coalesce(v_cost.labor_cost, 0),
      'external_cost', coalesce(v_cost.effective_external_cost, 0),
      'total_cost', coalesce(v_cost.total_cost, 0),
      'procurement_received_cost', v_cost.procurement_received_cost,
      'procurement_currency', v_cost.procurement_currency,
      'procurement_currency_count', coalesce(v_cost.procurement_currency_count, 0),
      'procurement_received_cost_is_evidence_only', true,
      'external_cost_basis', v_cost.external_cost_basis,
      'runtime_evidence_status', v_runtime_evidence_status,
      'runtime_reading_id', v_runtime_reading_id,
      'standard_plan_pending_steps', v_pending_plan_steps,
      'material_reconciliation_deferred', true,
      'unmet_material_requirements', coalesce(v_cost.unmet_material_requirements, 0),
      'pending_parts', coalesce(v_cost.pending_parts, 0),
      'open_procurement_orders', coalesce(v_cost.open_procurement_orders, 0)
    )
  );

  return p_work_order_id;
end;
$function$
;
