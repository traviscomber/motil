-- Canonical read model for deduplicated asset meter observations.
-- Source rows remain untouched; repeated import copies collapse to one observation.

create or replace view public.planning_asset_meter_observations_v1
with (security_invoker = true)
as
select distinct on (
  organization_id,
  canonical_asset_id,
  recorded_at,
  meter_value,
  meter_unit
)
  id,
  organization_id,
  canonical_asset_id,
  recorded_at,
  meter_value,
  meter_unit,
  source_kind,
  source_reference,
  count(*) over (
    partition by organization_id, canonical_asset_id, recorded_at, meter_value, meter_unit
  ) as evidence_row_count
from public.planning_asset_meter_readings
where canonical_asset_id is not null
  and meter_value is not null
order by
  organization_id,
  canonical_asset_id,
  recorded_at,
  meter_value,
  meter_unit,
  case source_kind
    when 'workbook_history' then 1
    when 'workbook_current' then 2
    when 'workbook_initial' then 3
    else 9
  end,
  id;

revoke all on public.planning_asset_meter_observations_v1 from anon, authenticated;
