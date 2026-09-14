create or replace view public.executive_operational_scorecard_v3
with (security_invoker = true)
as
with orgs as (
  select organization_id from public.production_plant_shifts
  union
  select organization_id from public.production_metallurgy_deterministic_v2
  union
  select organization_id from public.production_concentrate_shipments
  union
  select organization_id from public.production_concentrate_shipment_allocations
  union
  select organization_id from public.production_material_movements
  union
  select organization_id from public.maintenance_work_orders
  union
  select organization_id from public.canonical_hse_incidents_v1
  union
  select organization_id from public.canonical_hse_inspections_v1
  union
  select organization_id from public.canonical_hse_risks_v1
), executive_cargos as (
  select id as cargo_id, name as cargo_name
  from public.cargos
  where name = any(array['GERENTE'::text,'SUBGERENTE OP.'::text,'PRESIDENTE'::text])
), plant as (
  select organization_id,
         count(*)::numeric as shifts,
         coalesce(sum(treated_metric_tons),0)::numeric as treated_tons
  from public.production_plant_shifts
  group by organization_id
), met as (
  select organization_id,
         count(*)::numeric as met_rows,
         count(*) filter (where metallurgy_state='assayed')::numeric as assayed
  from public.production_metallurgy_deterministic_v2
  group by organization_id
), ship as (
  select organization_id,
         count(*)::numeric as shipments,
         coalesce(sum(normalized_metric_tons),0)::numeric as wet_tons
  from public.production_concentrate_shipments
  group by organization_id
), alloc as (
  select organization_id,
         coalesce(sum(allocated_wet_metric_tons),0)::numeric as allocated_tons
  from public.production_concentrate_shipment_allocations
  group by organization_id
), mine as (
  select organization_id,
         count(*)::numeric as movements,
         coalesce(sum(normalized_metric_tons),0)::numeric as movement_tons,
         count(*) filter (where mine_name_raw is not null)::numeric as named_movements
  from public.production_material_movements
  group by organization_id
), maint as (
  select organization_id,
         count(*)::numeric as total,
         count(*) filter (where status=any(array['completed'::text,'closed'::text]))::numeric as closed,
         count(*) filter (where status<>all(array['completed'::text,'closed'::text,'cancelled'::text]))::numeric as backlog,
         avg(actual_duration_hours) filter (where status=any(array['completed'::text,'closed'::text]) and actual_duration_hours is not null) as mttr,
         count(*) filter (where work_type ilike '%prevent%')::numeric as prev_total,
         count(*) filter (where work_type ilike '%prevent%' and status=any(array['completed'::text,'closed'::text]))::numeric as prev_closed
  from public.maintenance_work_orders
  group by organization_id
), inc as (
  select organization_id,
         count(*)::numeric as incidents,
         count(*) filter (where status<>all(array['cerrado'::text,'closed'::text]))::numeric as open_incidents,
         coalesce(sum(injuries_count),0)::numeric as injuries
  from public.canonical_hse_incidents_v1
  group by organization_id
), insp as (
  select organization_id,
         count(*)::numeric as inspections,
         count(*) filter (where status=any(array['completada'::text,'completed'::text]) or actual_date is not null)::numeric as completed_inspections
  from public.canonical_hse_inspections_v1
  group by organization_id
), risk as (
  select organization_id,
         count(*)::numeric as risks,
         count(*) filter (where next_review_date<current_date)::numeric as overdue_risks
  from public.canonical_hse_risks_v1
  group by organization_id
)
select o.organization_id,
       c.cargo_id,
       c.cargo_name,
       v.domain,
       v.kpi_key,
       v.label,
       v.unit,
       v.measured_value,
       v.direction,
       'baseline'::text as evaluation_state,
       now() as measured_at,
       jsonb_build_object(
         'scope','executive operational baseline',
         'personal_evaluation',false,
         'targets_defined',false,
         'tenant_scope','organization_id',
         'source_note','Each metric requires evidence from its own tenant-scoped source. Missing source evidence remains unknown instead of zero.'
       ) as evidence
from orgs o
cross join executive_cargos c
left join plant p on p.organization_id=o.organization_id
left join met m on m.organization_id=o.organization_id
left join ship s on s.organization_id=o.organization_id
left join alloc a on a.organization_id=o.organization_id
left join mine mn on mn.organization_id=o.organization_id
left join maint ma on ma.organization_id=o.organization_id
left join inc i on i.organization_id=o.organization_id
left join insp ins on ins.organization_id=o.organization_id
left join risk r on r.organization_id=o.organization_id
cross join lateral (values
  ('production'::text,'treated_tons'::text,'Toneladas tratadas'::text,'t'::text,p.treated_tons,'informational'::text),
  ('production'::text,'metallurgy_assay_coverage'::text,'Cobertura metalúrgica'::text,'%'::text,case when m.met_rows is null or m.met_rows=0 then null else m.assayed*100/m.met_rows end,'higher_is_better'::text),
  ('production'::text,'dispatch_wet_tons'::text,'Concentrado despachado'::text,'t'::text,s.wet_tons,'informational'::text),
  ('production'::text,'dispatch_lineage_coverage'::text,'Cobertura linaje despacho'::text,'%'::text,case when s.wet_tons is null or s.wet_tons=0 then null else coalesce(a.allocated_tons,0)*100/s.wet_tons end,'higher_is_better'::text),
  ('mine'::text,'movement_tons'::text,'Toneladas movimiento mina'::text,'t'::text,mn.movement_tons,'informational'::text),
  ('data_quality'::text,'mine_identification_coverage'::text,'Cobertura identificación mina'::text,'%'::text,case when mn.movements is null or mn.movements=0 then null else mn.named_movements*100/mn.movements end,'higher_is_better'::text),
  ('maintenance'::text,'work_order_closure_rate'::text,'Cierre OT'::text,'%'::text,case when ma.total is null or ma.total=0 then null else ma.closed*100/ma.total end,'higher_is_better'::text),
  ('maintenance'::text,'open_backlog'::text,'Backlog Mantención'::text,'OT'::text,case when ma.total is null then null else ma.backlog end,'lower_is_better'::text),
  ('maintenance'::text,'mttr_hours'::text,'MTTR'::text,'h'::text,ma.mttr,'lower_is_better'::text),
  ('maintenance'::text,'preventive_closure_rate'::text,'Cumplimiento preventivo observado'::text,'%'::text,case when ma.prev_total is null or ma.prev_total=0 then null else ma.prev_closed*100/ma.prev_total end,'higher_is_better'::text),
  ('hse'::text,'open_incident_rate'::text,'Incidentes no cerrados'::text,'%'::text,case when i.incidents is null or i.incidents=0 then null else i.open_incidents*100/i.incidents end,'lower_is_better'::text),
  ('hse'::text,'injuries'::text,'Lesiones registradas'::text,'lesiones'::text,case when i.incidents is null or i.incidents=0 then null else i.injuries end,'lower_is_better'::text),
  ('hse'::text,'inspection_completion_rate'::text,'Inspecciones completadas'::text,'%'::text,case when ins.inspections is null or ins.inspections=0 then null else ins.completed_inspections*100/ins.inspections end,'higher_is_better'::text),
  ('risk'::text,'overdue_risk_reviews'::text,'Revisiones de riesgo vencidas'::text,'riesgos'::text,case when r.risks is null or r.risks=0 then null else r.overdue_risks end,'lower_is_better'::text)
) v(domain,kpi_key,label,unit,measured_value,direction);

revoke all on public.executive_operational_scorecard_v3 from anon, authenticated;
grant select on public.executive_operational_scorecard_v3 to service_role;

comment on view public.executive_operational_scorecard_v3 is
  'Backend-only multi-tenant executive operational baseline. Organizations are discovered from tenant-scoped operational evidence; missing domain evidence remains NULL.';
