begin;


-- Instalacion operativa confirmada por supervisor, separada de la salida de bodega.
-- No afecta work_order_parts, stock_movements, warehouse_stock ni solicitudes de abastecimiento.
create table if not exists public.work_order_material_approval_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  requirement_id uuid not null references public.work_order_material_requirements(id) on delete restrict,
  canonical_product_id uuid not null references canonical.products(id),
  installed_quantity numeric not null check (installed_quantity > 0),
  supervisor_review_id uuid not null references public.work_order_supervisor_reviews(id),
  confirmed_by_profile_id uuid not null,
  confirmed_by_person_id uuid not null,
  confirmed_by_name text not null,
  confirmed_at timestamptz not null default now(),
  warehouse_reconciliation_status text not null default 'pending'
    check (warehouse_reconciliation_status in ('pending', 'reconciled')),
  unique (organization_id, work_order_id, requirement_id)
);
create index if not exists work_order_material_approval_installations_org_order_idx
  on public.work_order_material_approval_installations (organization_id, work_order_id);
alter table public.work_order_material_approval_installations enable row level security;
revoke all on public.work_order_material_approval_installations from public, anon, authenticated;
grant all on public.work_order_material_approval_installations to service_role;

create or replace function public.approve_work_order_with_material_confirmation_v1(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_reviewer_profile_id uuid,
  p_confirm_materials_installed boolean default false,
  p_decision_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_reviewer public.people%rowtype;
  v_review public.work_order_supervisor_reviews%rowtype;
  v_requirement record;
  v_installed_from_warehouse numeric;
  v_to_confirm numeric;
  v_active_requirements integer := 0;
  v_confirmed_lines integer := 0;
  v_now timestamptz := now();
begin
  -- Solo se expone a service_role; igualmente se verifica persona, cargo, tenant y OT.
  select * into v_reviewer
  from public.people pe
  where pe.organization_id = p_organization_id
    and pe.profile_id = p_reviewer_profile_id
    and pe.employment_status = 'active'
    and pe.full_name in ('Ariel López', 'Mauricio Astudillo')
  limit 1;
  if not found then
    raise exception 'Solo Ariel López o Mauricio Astudillo pueden aprobar la OT'
      using errcode = '42501';
  end if;

  select * into v_wo
  from public.maintenance_work_orders
  where organization_id = p_organization_id and id = p_work_order_id
  for update;
  if not found then
    raise exception 'La OT no existe en esta organización' using errcode = 'P0002';
  end if;
  if v_wo.created_by is null then
    raise exception 'La OT histórica es de solo lectura' using errcode = '55000';
  end if;
  if v_wo.status <> 'completed' then
    raise exception 'La OT debe estar terminada antes de ser aprobada' using errcode = '55000';
  end if;

  select * into v_review from public.work_order_supervisor_reviews
  where organization_id = p_organization_id and work_order_id = p_work_order_id
  for update;
  if found and v_review.status = 'approved' then
    return v_review.id; -- Reintentos no duplican instalaciones ni eventos.
  end if;

  select count(*) into v_active_requirements
  from public.work_order_material_requirements
  where organization_id = p_organization_id
    and work_order_id = p_work_order_id
    and status <> 'cancelled';

  if v_active_requirements > 0 and p_confirm_materials_installed is distinct from true then
    raise exception 'Confirma los repuestos instalados antes de aprobar; bodega seguirá pendiente'
      using errcode = '55000';
  end if;

  insert into public.work_order_supervisor_reviews (
    organization_id, work_order_id, status, decision_note,
    reviewed_by_profile_id, reviewed_by_person_id, reviewed_by_name, reviewed_at, updated_at
  ) values (
    p_organization_id, p_work_order_id, 'approved', nullif(trim(p_decision_note), ''),
    p_reviewer_profile_id, v_reviewer.id, v_reviewer.full_name, v_now, v_now
  )
  on conflict (organization_id, work_order_id) do update set
    status = 'approved',
    decision_note = excluded.decision_note,
    reviewed_by_profile_id = excluded.reviewed_by_profile_id,
    reviewed_by_person_id = excluded.reviewed_by_person_id,
    reviewed_by_name = excluded.reviewed_by_name,
    reviewed_at = excluded.reviewed_at,
    updated_at = excluded.updated_at
  returning * into v_review;

  for v_requirement in
    select req.id, req.canonical_product_id, req.quantity_required
    from public.work_order_material_requirements req
    where req.organization_id = p_organization_id
      and req.work_order_id = p_work_order_id
      and req.status <> 'cancelled'
    order by req.id
  loop
    -- Entrega fisica ya registrada no debe contarse dos veces.
    select coalesce(sum(p.quantity_installed), 0)
    into v_installed_from_warehouse
    from public.work_order_parts p
    where p.organization_id = p_organization_id
      and p.work_order_id = p_work_order_id
      and p.canonical_product_id = v_requirement.canonical_product_id;
    v_to_confirm := greatest(v_requirement.quantity_required - v_installed_from_warehouse, 0);
    if v_to_confirm > 0 then
      insert into public.work_order_material_approval_installations (
        organization_id, work_order_id, requirement_id, canonical_product_id,
        installed_quantity, supervisor_review_id,
        confirmed_by_profile_id, confirmed_by_person_id, confirmed_by_name, confirmed_at
      ) values (
        p_organization_id, p_work_order_id, v_requirement.id, v_requirement.canonical_product_id,
        v_to_confirm, v_review.id,
        p_reviewer_profile_id, v_reviewer.id, v_reviewer.full_name, v_now
      )
      on conflict (organization_id, work_order_id, requirement_id) do nothing;
      v_confirmed_lines := v_confirmed_lines + 1;
    end if;
  end loop;

  insert into public.work_order_events (
    organization_id, work_order_id, canonical_asset_id, event_type, event_at,
    actor_id, actor_name, source_table, source_record_id, summary, payload
  ) values (
    p_organization_id, p_work_order_id, v_wo.canonical_asset_id,
    'supervisor_approved', v_now, p_reviewer_profile_id, v_reviewer.full_name,
    'public.work_order_supervisor_reviews', v_review.id::text,
    'OT aprobada por supervisión; instalaciones confirmadas sin conciliar bodega',
    jsonb_build_object(
      'status', 'approved',
      'note', nullif(trim(p_decision_note), ''),
      'installation_confirmation_lines', v_confirmed_lines,
      'inventory_reconciled', false,
      'confirmation_source', 'supervisor_approval'
    )
  );
  return v_review.id;
end;
$function$;

revoke all on function public.approve_work_order_with_material_confirmation_v1(uuid,uuid,uuid,boolean,text)
  from public, anon, authenticated;
grant execute on function public.approve_work_order_with_material_confirmation_v1(uuid,uuid,uuid,boolean,text)
  to service_role;

create or replace function public.close_work_order_safely(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
      from public.user_roles ur
      where ur.user_id = v_actor
        and ur.organization_id = v_wo.organization_id
    )
    or exists (
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
  if coalesce(trim(v_wo.root_cause), '') = '' then
    raise exception 'Registra la causa principal antes de cerrar';
  end if;
  if coalesce(trim(v_wo.preventive_actions), '') = '' then
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
$function$;

revoke all on function public.close_work_order_safely(uuid) from public, anon, authenticated;
grant execute on function public.close_work_order_safely(uuid) to service_role;

commit;
