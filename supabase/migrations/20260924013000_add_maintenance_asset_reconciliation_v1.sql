-- Read-only reconciliation model for deterministic maintenance asset master improvements.
-- This view never mutates canonical assets. It exposes only unique, evidence-backed candidates.

create or replace view public.maintenance_asset_reconciliation_v1
with (security_invoker = true)
as
with planning_evidence as (
  select
    organization_id,
    canonical_asset_id,
    array_agg(distinct btrim(mine_raw)) filter (
      where mine_raw is not null
        and btrim(mine_raw) <> ''
        and upper(btrim(mine_raw)) not in (
          '#ERROR!','NO REGISTRADO','N/A','SIN MINA ASIGNADA','SIN ASIGNAR','NO ASIGNADO'
        )
    ) as locations,
    array_agg(distinct btrim(criticality_raw)) filter (
      where criticality_raw is not null
        and btrim(criticality_raw) <> ''
        and upper(btrim(criticality_raw)) not in ('#ERROR!','NO REGISTRADO','N/A')
    ) as criticalities
  from public.planning_maintenance_source_rows
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
),
cost_center_matches as (
  select
    a.organization_id,
    a.id as canonical_asset_id,
    count(*) as all_matches,
    count(*) filter (
      where c.code <> all(array[
        '1-11','1-13','2-11','2-13','3-3-1','3-6-1','3-6-2','3-6-3',
        '3-7-1','3-7-2','3-7-3','3-7-5','3-9-1','3-9-2','3-9-3','3-10-1','3-10-2'
      ])
    ) as canonical_matches,
    min(c.code) as any_code,
    min(c.code) filter (
      where c.code <> all(array[
        '1-11','1-13','2-11','2-13','3-3-1','3-6-1','3-6-2','3-6-3',
        '3-7-1','3-7-2','3-7-3','3-7-5','3-9-1','3-9-2','3-9-3','3-10-1','3-10-2'
      ])
    ) as canonical_code
  from public.canonical_assets_current a
  join public.cost_centers c
    on c.organization_id = a.organization_id
   and lower(coalesce(c.status,'active')) not in ('inactive','archived')
   and regexp_replace(
         regexp_replace(
           upper(translate(coalesce(a.name,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),
           '\m(SONDA|EQUIPO|MAQUINA|MÁQUINA)\M',' ','g'
         ),
         '[^A-Z0-9]+','','g'
       )
       =
       regexp_replace(
         regexp_replace(
           upper(translate(coalesce(c.name,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),
           '\m(SONDA|EQUIPO|MAQUINA|MÁQUINA)\M',' ','g'
         ),
         '[^A-Z0-9]+','','g'
       )
  where a.is_active = true
    and (a.cost_center_code is null or btrim(a.cost_center_code) = '')
  group by a.organization_id, a.id
)
select
  a.organization_id,
  a.id as canonical_asset_id,
  a.asset_code,
  a.name,
  a.location as current_location,
  a.criticality as current_criticality,
  a.cost_center_code as current_cost_center_code,
  case
    when (a.location is null or btrim(a.location) = '')
      and cardinality(coalesce(p.locations,'{}'::text[])) = 1
      then p.locations[1]
    else null
  end as proposed_location,
  case
    when (a.criticality is null or btrim(a.criticality) = '')
      and cardinality(coalesce(p.criticalities,'{}'::text[])) = 1
      then p.criticalities[1]
    else null
  end as proposed_criticality,
  case
    when a.cost_center_code is null or btrim(a.cost_center_code) = '' then
      case
        when cc.all_matches = 1 then cc.any_code
        when cc.all_matches > 1 and cc.canonical_matches = 1 then cc.canonical_code
        else null
      end
    else null
  end as proposed_cost_center_code,
  cardinality(coalesce(p.locations,'{}'::text[])) as location_candidate_count,
  cardinality(coalesce(p.criticalities,'{}'::text[])) as criticality_candidate_count,
  coalesce(cc.all_matches,0) as cost_center_match_count,
  case
    when
      (
        (a.location is null or btrim(a.location) = '')
        and cardinality(coalesce(p.locations,'{}'::text[])) = 1
      )
      or (
        (a.criticality is null or btrim(a.criticality) = '')
        and cardinality(coalesce(p.criticalities,'{}'::text[])) = 1
      )
      or (
        (a.cost_center_code is null or btrim(a.cost_center_code) = '')
        and (
          cc.all_matches = 1
          or (cc.all_matches > 1 and cc.canonical_matches = 1)
        )
      )
    then 'deterministic_candidate'
    when
      cardinality(coalesce(p.locations,'{}'::text[])) > 1
      or cardinality(coalesce(p.criticalities,'{}'::text[])) > 1
      or coalesce(cc.all_matches,0) > 1
    then 'review_required'
    else 'no_candidate'
  end as reconciliation_status
from public.canonical_assets_current a
left join planning_evidence p
  on p.organization_id = a.organization_id
 and p.canonical_asset_id = a.id
left join cost_center_matches cc
  on cc.organization_id = a.organization_id
 and cc.canonical_asset_id = a.id
where a.is_active = true;

revoke all on public.maintenance_asset_reconciliation_v1 from anon, authenticated;
