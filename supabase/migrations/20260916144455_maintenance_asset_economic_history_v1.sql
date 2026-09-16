create or replace view public.maintenance_asset_economic_history_v1
with (security_invoker = true)
as
select
  l.organization_id,
  a.id as canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  a.category as asset_category,
  a.is_active,
  extract(year from l.event_at)::integer as fiscal_year,
  count(*)::bigint as movement_count,
  sum(l.amount)::numeric as historical_total_cost,
  min(l.event_at)::date as first_cost_date,
  max(l.event_at)::date as last_cost_date
from public.canonical_clp_cost_ledger l
join public.canonical_assets_current a
  on a.organization_id = l.organization_id
 and a.id = l.canonical_asset_id
where lower(coalesce(l.recognition_status, '')) = 'recognized'
group by
  l.organization_id,
  a.id,
  a.asset_code,
  a.name,
  a.category,
  a.is_active,
  extract(year from l.event_at)::integer;

revoke all on public.maintenance_asset_economic_history_v1 from anon, authenticated;
grant select on public.maintenance_asset_economic_history_v1 to service_role;

comment on view public.maintenance_asset_economic_history_v1 is
'Historical recognized CLP asset-cost evidence by canonical asset and year, derived directly from canonical_clp_cost_ledger canonical_asset_id. Includes inactive historical assets. Finance/history evidence only; do not conflate with audited work-order closure costs.';
