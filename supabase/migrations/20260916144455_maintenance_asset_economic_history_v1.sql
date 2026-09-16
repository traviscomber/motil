create or replace view public.maintenance_asset_economic_history_v1
with (security_invoker = true)
as
select
  c.organization_id,
  a.id as canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  a.category as asset_category,
  a.is_active,
  extract(year from c.transaction_date)::integer as fiscal_year,
  count(*)::bigint as movement_count,
  sum(c.total_cost)::numeric as historical_total_cost,
  min(c.transaction_date) as first_cost_date,
  max(c.transaction_date) as last_cost_date
from public.canonical_asset_costs_current c
join public.canonical_assets_current a
  on a.organization_id = c.organization_id
 and regexp_replace(lower(coalesce(a.asset_code, '')), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(c.asset_code, '')), '[^a-z0-9]+', '', 'g')
where c.currency = 'CLP'
  and c.validation_status = 'valid'
group by
  c.organization_id,
  a.id,
  a.asset_code,
  a.name,
  a.category,
  a.is_active,
  extract(year from c.transaction_date)::integer;

revoke all on public.maintenance_asset_economic_history_v1 from anon, authenticated;
grant select on public.maintenance_asset_economic_history_v1 to service_role;

comment on view public.maintenance_asset_economic_history_v1 is
'Historical CLP asset-cost evidence by canonical asset and year. Includes inactive historical assets. This is finance/history evidence and must not be conflated with audited work-order closure costs.';
