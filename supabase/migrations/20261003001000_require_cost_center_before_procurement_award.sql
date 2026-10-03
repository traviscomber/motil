-- Prevent procurement from creating a financial commitment without a canonical
-- cost center. Draft/quotation stages may exist without one, but award/PO issuance may not.

do $$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'award_supplier_quotation'
    and pg_get_function_identity_arguments(p.oid) = 'p_quotation_id uuid, p_actor_id uuid';

  if v_definition is null then
    raise exception 'award_supplier_quotation(uuid,uuid) not found';
  end if;

  v_old := $needle$
  select * into r from canonical.procurement_requests where id=q.request_id and organization_id=q.organization_id for update;
  if not found then raise exception 'Solicitud asociada no encontrada'; end if;
  select * into s from canonical.suppliers where id=q.supplier_id and organization_id=q.organization_id;
$needle$;

  v_new := $replacement$
  select * into r from canonical.procurement_requests where id=q.request_id and organization_id=q.organization_id for update;
  if not found then raise exception 'Solicitud asociada no encontrada'; end if;

  if nullif(btrim(coalesce(r.cost_center_code, '')), '') is null then
    raise exception 'La solicitud debe tener un centro de costo antes de adjudicar y emitir la OC';
  end if;

  if not exists (
    select 1
    from canonical.cost_centers cc
    where cc.organization_id = r.organization_id
      and cc.cost_center_code = r.cost_center_code
      and cc.is_active = true
      and cc.validation_status = 'valid'
  ) then
    raise exception 'El centro de costo de la solicitud no es canónico, válido y activo';
  end if;

  select * into s from canonical.suppliers where id=q.supplier_id and organization_id=q.organization_id;
$replacement$;

  if position(v_old in v_definition) = 0 then
    raise exception 'expected procurement request lookup block not found';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$$;
