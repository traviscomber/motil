create or replace function public.create_intake_quotation(
  p_intake_request_id uuid,
  p_supplier_id uuid,
  p_lead_time_days integer,
  p_payment_terms text,
  p_valid_until date,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_request public.procurement_intake_requests%rowtype;
  v_quote_id uuid;
  v_number text;
  v_line jsonb;
  v_total numeric := 0;
  v_next integer;
begin
  select * into v_request
  from public.procurement_intake_requests
  where id=p_intake_request_id
  for update;

  if not found then raise exception 'Solicitud operativa no encontrada'; end if;
  if v_request.organization_id not in (
    select organization_id from public.user_roles
    where user_id=public.current_application_user_id()
  ) then raise exception 'Sin permisos'; end if;

  if not exists (
    select 1 from canonical.suppliers
    where id=p_supplier_id
      and organization_id=v_request.organization_id
      and is_active=true
  ) then raise exception 'Proveedor canónico inválido'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'procurement_quote:'||v_request.organization_id::text||':'||to_char(current_date,'YYYY'), 0
  ));

  select coalesce(max(
    case
      when quotation_number ~ ('^COT-'||to_char(current_date,'YYYY')||'-[0-9]{5}$')
      then right(quotation_number,5)::integer
      else null
    end
  ),0)+1
  into v_next
  from public.procurement_intake_quotations
  where organization_id=v_request.organization_id;

  v_number := 'COT-'||to_char(current_date,'YYYY')||'-'||lpad(v_next::text,5,'0');

  insert into public.procurement_intake_quotations(
    organization_id,intake_request_id,supplier_id,quotation_number,
    lead_time_days,payment_terms,valid_until,created_by
  )
  values(
    v_request.organization_id,p_intake_request_id,p_supplier_id,v_number,
    p_lead_time_days,p_payment_terms,p_valid_until,public.current_application_user_id()
  )
  returning id into v_quote_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if not exists (
      select 1 from public.procurement_intake_request_lines
      where id=(v_line->>'intake_line_id')::uuid
        and intake_request_id=p_intake_request_id
    ) then raise exception 'Línea no pertenece a la solicitud'; end if;

    insert into public.procurement_intake_quotation_lines(
      organization_id,quotation_id,intake_line_id,canonical_product_id,quantity,unit_cost
    )
    select v_request.organization_id,v_quote_id,l.id,l.canonical_product_id,
      coalesce((v_line->>'quantity')::numeric,l.quantity),
      (v_line->>'unit_cost')::numeric
    from public.procurement_intake_request_lines l
    where l.id=(v_line->>'intake_line_id')::uuid;
  end loop;

  select coalesce(sum(total_cost),0) into v_total
  from public.procurement_intake_quotation_lines
  where quotation_id=v_quote_id;

  update public.procurement_intake_quotations set total_amount=v_total where id=v_quote_id;
  update public.procurement_intake_requests set status='quoted',updated_at=now() where id=p_intake_request_id;

  return v_quote_id;
end
$function$;
