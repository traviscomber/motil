-- Make canonical finance alerts operationally precise and expose row-level
-- exception lineage without mutating canonical source data.

create or replace view intelligence.canonical_finance_alerts as
with orgs as (
  select distinct organization_id
  from intelligence.canonical_clp_cost_ledger
),
validation as (
  select
    organization_id,
    status,
    started_at,
    completed_at,
    failed_checks,
    total_checks,
    notes
  from intelligence.latest_canonical_financial_validation
),
zero_lines as (
  select organization_id, count(*) as exceptions
  from canonical.purchase_order_lines
  where validation_status = 'valid'
    and coalesce(net_amount, 0::numeric) = 0::numeric
  group by organization_id
),
source_warnings as (
  select organization_id, count(*) as exceptions
  from canonical.purchase_order_lines
  where coalesce(validation_status, '') <> 'valid'
  group by organization_id
),
unlinked_products as (
  select l.organization_id, count(*) as exceptions
  from canonical.purchase_order_lines l
  where l.validation_status = 'valid'
    and nullif(trim(coalesce(l.product_code, '')), '') is not null
    and not exists (
      select 1
      from canonical.products p
      where p.organization_id = l.organization_id
        and upper(trim(p.product_code)) = upper(trim(l.product_code))
    )
  group by l.organization_id
),
missing_centers as (
  select organization_id, count(*) as exceptions
  from canonical.purchase_order_lines
  where validation_status = 'valid'
    and nullif(trim(coalesce(cost_center_code, '')), '') is null
  group by organization_id
)
select
  o.organization_id,
  'validation'::text as alert_code,
  case
    when v.organization_id is null then 'Validación financiera no acreditada'::text
    when lower(coalesce(v.status, '')) = 'passed' then 'Validación financiera'::text
    else 'Validación financiera con observaciones'::text
  end as title,
  case
    when lower(coalesce(v.status, '')) = 'passed' then 'info'::text
    else 'critical'::text
  end as severity,
  case
    when v.organization_id is null then 1::bigint
    when lower(coalesce(v.status, '')) = 'passed' then 0::bigint
    else greatest(coalesce(v.failed_checks, 0), 1)::bigint
  end as exception_count,
  case
    when v.organization_id is null then 'No existe evidencia de una validación financiera exhaustiva vigente.'::text
    when lower(coalesce(v.status, '')) = 'passed' then 'La validación exhaustiva está aprobada.'::text
    else concat_ws(' · ',
      'La validación exhaustiva requiere revisión.',
      case when v.failed_checks is not null then 'checks fallidos ' || v.failed_checks::text else null end,
      nullif(v.notes, '')
    )
  end as description
from orgs o
left join validation v using (organization_id)

union all

select
  o.organization_id,
  'zero_amount_lines'::text as alert_code,
  'Líneas válidas con monto cero'::text as title,
  'warning'::text as severity,
  coalesce(z.exceptions, 0::bigint) as exception_count,
  'Líneas canónicas válidas cuyo monto neto es nulo o cero; revisar la fila fuente antes de corregir.'::text as description
from orgs o
left join zero_lines z using (organization_id)

union all

select
  o.organization_id,
  'source_warning_lines'::text as alert_code,
  'Líneas de compra con advertencia de fuente'::text as title,
  'warning'::text as severity,
  coalesce(s.exceptions, 0::bigint) as exception_count,
  'Filas preservadas para trazabilidad pero marcadas con warning; no se cuentan como deuda financiera válida.'::text as description
from orgs o
left join source_warnings s using (organization_id)

union all

select
  o.organization_id,
  'unlinked_products'::text as alert_code,
  'Productos sin cruce'::text as title,
  'warning'::text as severity,
  coalesce(u.exceptions, 0::bigint) as exception_count,
  'Líneas de compra válidas cuyo código no coincide con un producto canónico.'::text as description
from orgs o
left join unlinked_products u using (organization_id)

union all

select
  o.organization_id,
  'missing_cost_centers'::text as alert_code,
  'Centro de costo ausente en línea válida'::text as title,
  'warning'::text as severity,
  coalesce(m.exceptions, 0::bigint) as exception_count,
  'Líneas de compra válidas sin centro de costo acreditado.'::text as description
from orgs o
left join missing_centers m using (organization_id);

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
where coalesce(l.validation_status, '') <> 'valid';

revoke all on public.finance_purchase_line_exceptions_v1 from public;
revoke select on public.finance_purchase_line_exceptions_v1 from anon, authenticated;
grant select on public.finance_purchase_line_exceptions_v1 to service_role;
