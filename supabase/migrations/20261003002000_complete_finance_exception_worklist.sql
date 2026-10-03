-- Extend the finance exception worklist with valid purchase lines whose product
-- code has no canonical product match.

create or replace view public.finance_purchase_line_exceptions_v1 as
select
  l.organization_id,
  'zero_amount_lines'::text as exception_kind,
  l.id as line_id,
  l.purchase_order_id,
  l.order_number,
  l.line_number,
  l.product_code,
  l.description,
  l.quantity,
  l.unit,
  l.unit_cost,
  l.net_amount,
  l.cost_center_code,
  l.validation_status,
  l.validation_notes,
  l.source_file,
  l.source_sheet,
  l.source_row,
  l.imported_at,
  nullif(trim(coalesce(l.source_payload ->> 'PROVEEDOR', '')), '') as supplier_name,
  nullif(trim(coalesce(l.source_payload ->> 'FECHA', '')), '') as source_date,
  'Revisar monto en la fila fuente antes de reimportar o corregir el origen.'::text as recommended_action
from canonical.purchase_order_lines l
where l.validation_status = 'valid'
  and coalesce(l.net_amount, 0::numeric) = 0::numeric

union all

select
  l.organization_id,
  'missing_cost_centers'::text as exception_kind,
  l.id as line_id,
  l.purchase_order_id,
  l.order_number,
  l.line_number,
  l.product_code,
  l.description,
  l.quantity,
  l.unit,
  l.unit_cost,
  l.net_amount,
  l.cost_center_code,
  l.validation_status,
  l.validation_notes,
  l.source_file,
  l.source_sheet,
  l.source_row,
  l.imported_at,
  nullif(trim(coalesce(l.source_payload ->> 'PROVEEDOR', '')), '') as supplier_name,
  nullif(trim(coalesce(l.source_payload ->> 'FECHA', '')), '') as source_date,
  'Asignar o acreditar el centro de costo en el flujo fuente antes del cierre financiero.'::text as recommended_action
from canonical.purchase_order_lines l
where l.validation_status = 'valid'
  and nullif(trim(coalesce(l.cost_center_code, '')), '') is null

union all

select
  l.organization_id,
  'source_warning_lines'::text as exception_kind,
  l.id as line_id,
  l.purchase_order_id,
  l.order_number,
  l.line_number,
  l.product_code,
  l.description,
  l.quantity,
  l.unit,
  l.unit_cost,
  l.net_amount,
  l.cost_center_code,
  l.validation_status,
  l.validation_notes,
  l.source_file,
  l.source_sheet,
  l.source_row,
  l.imported_at,
  nullif(trim(coalesce(l.source_payload ->> 'PROVEEDOR', '')), '') as supplier_name,
  nullif(trim(coalesce(l.source_payload ->> 'FECHA', '')), '') as source_date,
  'Revisar la fila fuente; esta línea permanece fuera de los conteos financieros válidos.'::text as recommended_action
from canonical.purchase_order_lines l
where coalesce(l.validation_status, '') <> 'valid'

union all

select
  l.organization_id,
  'unlinked_products'::text as exception_kind,
  l.id as line_id,
  l.purchase_order_id,
  l.order_number,
  l.line_number,
  l.product_code,
  l.description,
  l.quantity,
  l.unit,
  l.unit_cost,
  l.net_amount,
  l.cost_center_code,
  l.validation_status,
  l.validation_notes,
  l.source_file,
  l.source_sheet,
  l.source_row,
  l.imported_at,
  nullif(trim(coalesce(l.source_payload ->> 'PROVEEDOR', '')), '') as supplier_name,
  nullif(trim(coalesce(l.source_payload ->> 'FECHA', '')), '') as source_date,
  'Resolver el código contra el catálogo canónico de productos antes de usar la línea para análisis por producto.'::text as recommended_action
from canonical.purchase_order_lines l
where l.validation_status = 'valid'
  and nullif(trim(coalesce(l.product_code, '')), '') is not null
  and not exists (
    select 1
    from canonical.products p
    where p.organization_id = l.organization_id
      and upper(trim(p.product_code)) = upper(trim(l.product_code))
  );

revoke all on public.finance_purchase_line_exceptions_v1 from public;
revoke select on public.finance_purchase_line_exceptions_v1 from anon, authenticated;
grant select on public.finance_purchase_line_exceptions_v1 to service_role;
