do $do$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.award_intake_quotation(uuid)'::regprocedure)
    into v_def;

  v_def := replace(
    v_def,
    '  v_order_number text;',
    E'  v_order_number text;\n  v_next integer;'
  );

  v_old := $txt$  v_order_number := 'OCO-'||to_char(current_date,'YYYY')||'-'||lpad((coalesce((select count(*)+1 from public.procurement_operational_orders where organization_id=v_quote.organization_id),1))::text,5,'0');$txt$;

  v_new := $txt$  perform pg_advisory_xact_lock(hashtextextended(
    'procurement_order:'||v_quote.organization_id::text||':'||to_char(current_date,'YYYY'), 0
  ));
  select coalesce(max(
    case
      when order_number ~ ('^OCO-'||to_char(current_date,'YYYY')||'-[0-9]{5}$')
      then right(order_number,5)::integer
      else null
    end
  ),0)+1
  into v_next
  from public.procurement_operational_orders
  where organization_id=v_quote.organization_id;
  v_order_number := 'OCO-'||to_char(current_date,'YYYY')||'-'||lpad(v_next::text,5,'0');$txt$;

  if position(v_old in v_def)=0 then
    raise exception 'Expected OCO numbering expression not found';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$do$;
