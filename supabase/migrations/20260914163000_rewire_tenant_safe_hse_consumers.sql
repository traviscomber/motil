create or replace view public.executive_operational_scorecard_v2
with (security_invoker = true)
as
with org as (
  select id as organization_id
  from public.organizations
  where name = 'N3uralia'
  limit 1
), prod as (
  select p.organization_id,
         p.treated_tons,
         p.shifts,
         case when m.met_rows = 0 then null else m.assayed * 100 / m.met_rows end as assay_coverage,
         coalesce(s.shipments,0) as shipments,
         coalesce(s.wet_tons,0) as dispatch_wet_tons,
         case when coalesce(s.wet_tons,0)=0 then null else coalesce(a.allocated_tons,0)*100/s.wet_tons end as dispatch_lineage_coverage
  from (
    select organization_id, count(*)::numeric as shifts,
           coalesce(sum(treated_metric_tons),0)::numeric as treated_tons
    from public.production_plant_shifts
    group by organization_id
  ) p
  left join (
    select organization_id, count(*)::numeric as met_rows,
           count(*) filter (where metallurgy_state='assayed')::numeric as assayed
    from public.production_metallurgy_deterministic_v2
    group by organization_id
  ) m using (organization_id)
  left join (
    select organization_id, count(*)::numeric as shipments,
           coalesce(sum(normalized_metric_tons),0)::numeric as wet_tons
    from public.production_concentrate_shipments
    group by organization_id
  ) s using (organization_id)
  left join (
    select organization_id,
           coalesce(sum(allocated_wet_metric_tons),0)::numeric as allocated_tons
    from public.production_concentrate_shipment_allocations
    group by organization_id
  ) a using (organization_id)
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
), hse as (
  select o.organization_id,
         coalesce(i.incidents,0)::numeric as incidents,
         coalesce(i.open_incidents,0)::numeric as open_incidents,
         coalesce(i.injuries,0)::numeric as injuries,
         coalesce(ins.inspections,0)::numeric as inspections,
         coalesce(ins.completed_inspections,0)::numeric as completed_inspections,
         coalesce(r.overdue_risks,0)::numeric as overdue_risks
  from org o
  left join (
    select organization_id,
           count(*)::numeric as incidents,
           count(*) filter (where status<>all(array['cerrado'::text,'closed'::text]))::numeric as open_incidents,
           coalesce(sum(injuries_count),0)::numeric as injuries
    from public.canonical_hse_incidents_v1
    group by organization_id
  ) i using (organization_id)
  left join (
    select organization_id,
           count(*)::numeric as inspections,
           count(*) filter (where status=any(array['completada'::text,'completed'::text]) or actual_date is not null)::numeric as completed_inspections
    from public.canonical_hse_inspections_v1
    group by organization_id
  ) ins using (organization_id)
  left join (
    select organization_id,
           count(*) filter (where next_review_date<current_date)::numeric as overdue_risks
    from public.canonical_hse_risks_v1
    group by organization_id
  ) r using (organization_id)
)
select o.organization_id,
       c.id as cargo_id,
       c.name as cargo_name,
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
         'source_note','HSE uses tenant-scoped canonical evidence only; unmapped legacy HSE rows are excluded.'
       ) as evidence
from org o
join public.cargos c on c.name=any(array['GERENTE'::text,'SUBGERENTE OP.'::text,'PRESIDENTE'::text])
left join prod p on p.organization_id=o.organization_id
left join mine mn on mn.organization_id=o.organization_id
left join maint ma on ma.organization_id=o.organization_id
left join hse on hse.organization_id=o.organization_id
cross join lateral (values
  ('production'::text,'treated_tons'::text,'Toneladas tratadas'::text,'t'::text,coalesce(p.treated_tons,0),'informational'::text),
  ('production'::text,'metallurgy_assay_coverage'::text,'Cobertura metalúrgica'::text,'%'::text,p.assay_coverage,'higher_is_better'::text),
  ('production'::text,'dispatch_wet_tons'::text,'Concentrado despachado'::text,'t'::text,coalesce(p.dispatch_wet_tons,0),'informational'::text),
  ('production'::text,'dispatch_lineage_coverage'::text,'Cobertura linaje despacho'::text,'%'::text,p.dispatch_lineage_coverage,'higher_is_better'::text),
  ('mine'::text,'movement_tons'::text,'Toneladas movimiento mina'::text,'t'::text,coalesce(mn.movement_tons,0),'informational'::text),
  ('data_quality'::text,'mine_identification_coverage'::text,'Cobertura identificación mina'::text,'%'::text,case when coalesce(mn.movements,0)=0 then null else mn.named_movements*100/mn.movements end,'higher_is_better'::text),
  ('maintenance'::text,'work_order_closure_rate'::text,'Cierre OT'::text,'%'::text,case when coalesce(ma.total,0)=0 then null else ma.closed*100/ma.total end,'higher_is_better'::text),
  ('maintenance'::text,'open_backlog'::text,'Backlog Mantención'::text,'OT'::text,coalesce(ma.backlog,0),'lower_is_better'::text),
  ('maintenance'::text,'mttr_hours'::text,'MTTR'::text,'h'::text,ma.mttr,'lower_is_better'::text),
  ('maintenance'::text,'preventive_closure_rate'::text,'Cumplimiento preventivo observado'::text,'%'::text,case when coalesce(ma.prev_total,0)=0 then null else ma.prev_closed*100/ma.prev_total end,'higher_is_better'::text),
  ('hse'::text,'open_incident_rate'::text,'Incidentes no cerrados'::text,'%'::text,case when hse.incidents=0 then null else hse.open_incidents*100/hse.incidents end,'lower_is_better'::text),
  ('hse'::text,'injuries'::text,'Lesiones registradas'::text,'lesiones'::text,hse.injuries,'lower_is_better'::text),
  ('hse'::text,'inspection_completion_rate'::text,'Inspecciones completadas'::text,'%'::text,case when hse.inspections=0 then null else hse.completed_inspections*100/hse.inspections end,'higher_is_better'::text),
  ('risk'::text,'overdue_risk_reviews'::text,'Revisiones de riesgo vencidas'::text,'riesgos'::text,hse.overdue_risks,'lower_is_better'::text)
) v(domain,kpi_key,label,unit,measured_value,direction);

revoke all on public.executive_operational_scorecard_v2 from anon, authenticated;
grant select on public.executive_operational_scorecard_v2 to service_role;

create or replace view public.operational_task_inbox_by_user_v2
with (security_invoker = true)
as
select l.auth_user_id as user_id,
       p.email,
       p.full_name,
       p.organization_id,
       p.cargo_id,
       t.cargo_name,
       t.task_key,
       t.domain,
       t.severity,
       t.priority_score,
       t.title,
       t.evidence_summary,
       t.status as source_status,
       t.material_related,
       t.occurred_at,
       t.recommended_action,
       t.responsibility,
       t.role_action,
       coalesce(s.status,'pending') as user_state,
       s.snoozed_until,
       p.id as profile_id,
       case when s.status='snoozed' and s.snoozed_until>now() then false else true end as visible_now,
       s.updated_at as user_state_updated_at
from public.auth_profile_identity_links l
join public.profiles p on p.id=l.profile_id and p.status='active'
join public.operational_tasks_by_cargo_v4 t on t.organization_id=p.organization_id and t.cargo_id=p.cargo_id
left join public.user_action_states s on s.organization_id=p.organization_id and s.user_id=l.auth_user_id and s.source_key=t.task_key;

revoke all on public.operational_task_inbox_by_user_v2 from anon, authenticated;
grant select on public.operational_task_inbox_by_user_v2 to service_role;

create or replace view public.operational_tasks_by_cargo_summary_v4
with (security_invoker = true)
as
select organization_id,
       cargo_id,
       cargo_name,
       count(*) filter (where responsibility='owner') as owned_tasks,
       count(*) filter (where responsibility='owner' and severity='critical') as owned_critical,
       count(*) filter (where responsibility='owner' and severity='warning') as owned_warning,
       count(*) filter (where responsibility='support') as support_items,
       count(*) filter (where responsibility='escalation') as escalations,
       max(priority_score) as max_priority
from public.operational_tasks_by_cargo_v4
group by organization_id,cargo_id,cargo_name;

revoke all on public.operational_tasks_by_cargo_summary_v4 from anon, authenticated;
grant select on public.operational_tasks_by_cargo_summary_v4 to service_role;

comment on view public.executive_operational_scorecard_v2 is
  'Executive operational baseline with HSE metrics sourced only from tenant-scoped canonical HSE views. No legal/compliance verdict.';
comment on view public.operational_task_inbox_by_user_v2 is
  'Backend-only tenant-safe user task inbox sourced from operational_tasks_by_cargo_v4; existing user_id column contract preserved.';
comment on view public.operational_tasks_by_cargo_summary_v4 is
  'Backend-only tenant-safe cargo summary sourced from operational_tasks_by_cargo_v4.';
