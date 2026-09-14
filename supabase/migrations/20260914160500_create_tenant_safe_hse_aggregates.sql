create or replace view public.hse_role_kpi_snapshot_v2
with (security_invoker = true)
as
with orgs as (
  select id as organization_id from public.organizations
), inc as (
  select organization_id,
         count(*)::numeric as total,
         count(*) filter (where status <> all (array['cerrado'::text,'closed'::text]))::numeric as open_count,
         coalesce(sum(injuries_count),0)::numeric as injuries
  from public.canonical_hse_incidents_v1
  group by organization_id
), insp as (
  select organization_id,
         count(*)::numeric as total,
         count(*) filter (where status = any (array['completada'::text,'completed'::text]) or actual_date is not null)::numeric as completed,
         coalesce(sum(findings_count),0)::numeric as findings
  from public.canonical_hse_inspections_v1
  group by organization_id
), risk as (
  select organization_id,
         count(*)::numeric as total,
         count(*) filter (where next_review_date < current_date)::numeric as overdue,
         avg(residual_risk_level) as residual_avg
  from public.canonical_hse_risks_v1
  group by organization_id
)
select
  o.organization_id,
  c.id as cargo_id,
  c.name as cargo_name,
  k.kpi_key,
  k.label,
  k.unit,
  case k.kpi_key
    when 'incident_open_rate' then case when coalesce(inc.total,0)=0 then null else inc.open_count*100/inc.total end
    when 'incident_injuries' then inc.injuries
    when 'inspection_completion_rate' then case when coalesce(insp.total,0)=0 then null else insp.completed*100/insp.total end
    when 'inspection_findings' then insp.findings
    when 'risk_review_overdue' then risk.overdue
    when 'residual_risk_avg' then risk.residual_avg
    else null::numeric
  end as measured_value,
  k.target_value,
  k.direction,
  case when k.target_value is null then 'baseline'::text else 'target_defined'::text end as evaluation_state,
  now() as measured_at,
  jsonb_build_object(
    'incident_total', coalesce(inc.total,0),
    'incident_open', coalesce(inc.open_count,0),
    'inspection_total', coalesce(insp.total,0),
    'inspection_completed', coalesce(insp.completed,0),
    'risk_total', coalesce(risk.total,0),
    'scope_note', 'Tenant-scoped HSE canonical mappings only. Unmapped legacy rows are excluded.',
    'source_note', 'Baseline operacional; no constituye evaluación personal ni usa metas inventadas.'
  ) as evidence
from orgs o
cross join public.cargos c
join public.role_operational_kpi_definitions k on k.cargo_id=c.id and k.enabled and k.source_domain='hse'
left join inc on inc.organization_id=o.organization_id
left join insp on insp.organization_id=o.organization_id
left join risk on risk.organization_id=o.organization_id;

revoke all on public.hse_role_kpi_snapshot_v2 from anon, authenticated;
grant select on public.hse_role_kpi_snapshot_v2 to service_role;

create or replace view public.operational_tasks_by_cargo_v4
with (security_invoker = true)
as
with motil_orgs as (
  select distinct organization_id from public.operational_attention_global_v1
), cargo_ref as (
  select distinct s.organization_id, s.cargo_id, s.cargo_name
  from public.role_operational_kpi_snapshot_v1 s
  join motil_orgs o using (organization_id)
  where s.cargo_id is not null and s.cargo_name is not null
), base as (
  select organization_id,cargo_id,cargo_name,task_key,domain,severity,priority_score,title,evidence_summary,status,material_related,occurred_at,recommended_action,responsibility,role_action
  from public.operational_tasks_by_cargo_v2
), hse_incident_tasks as (
  select c.organization_id,c.cargo_id,c.cargo_name,
    'incident:'||i.id::text as task_key,'hse'::text as domain,
    case when lower(coalesce(i.severity,''))='alto' then 'critical'::text else 'warning'::text end as severity,
    case when lower(coalesce(i.severity,''))='alto' then 100 else 85 end as priority_score,
    'Incidente '||coalesce(i.incident_number,i.id::text)||': '||coalesce(i.incident_type,'sin tipo') as title,
    concat_ws(' · ',nullif(i.location,''),nullif(i.description,''),case when coalesce(i.injuries_count,0)>0 then 'lesiones '||i.injuries_count::text end) as evidence_summary,
    coalesce(i.status,'reportado') as status,false as material_related,
    coalesce(i.date_occurred,i.date_reported,i.created_at)::timestamptz as occurred_at,
    case when lower(coalesce(i.severity,''))='alto' then 'lead_incident_response'::text else 'investigate_incident'::text end as recommended_action,
    case
      when lower(coalesce(i.severity,''))='alto' and c.cargo_name='JEFE SOSTENIBILIDAD' then 'owner'::text
      when lower(coalesce(i.severity,''))='alto' and c.cargo_name='PREVENCIONISTA' then 'support'::text
      when lower(coalesce(i.severity,''))<>'alto' and c.cargo_name='PREVENCIONISTA' then 'owner'::text
      when lower(coalesce(i.severity,''))<>'alto' and c.cargo_name='JEFE SOSTENIBILIDAD' then 'support'::text
      else 'none'::text end as responsibility,
    case when c.cargo_name='JEFE SOSTENIBILIDAD' then 'Coordinar contención, investigación y cierre.'::text else 'Investigar causa, levantar evidencia y proponer acciones.'::text end as role_action
  from public.canonical_hse_incidents_v1 i
  join cargo_ref c on c.organization_id=i.organization_id and c.cargo_name=any(array['JEFE SOSTENIBILIDAD'::text,'PREVENCIONISTA'::text])
  where lower(coalesce(i.status,''))<>all(array['cerrado'::text,'closed'::text,'resuelto'::text,'resolved'::text])
), hse_inspection_tasks as (
  select c.organization_id,c.cargo_id,c.cargo_name,
    'inspection:'||h.id::text as task_key,'hse'::text as domain,
    case when h.scheduled_date<current_date then 'warning'::text else 'info'::text end as severity,
    case when h.scheduled_date<current_date then 80 else 50 end as priority_score,
    'Inspección pendiente: '||coalesce(h.inspection_number,h.inspection_type,h.id::text) as title,
    concat_ws(' · ',nullif(h.inspection_type,''),nullif(h.scope,''),'programada '||h.scheduled_date::text) as evidence_summary,
    coalesce(h.status,'pendiente') as status,false as material_related,h.scheduled_date::timestamptz as occurred_at,
    'complete_hse_inspection'::text as recommended_action,
    case when c.cargo_name='PREVENCIONISTA' then 'owner'::text else 'support'::text end as responsibility,
    case when c.cargo_name='PREVENCIONISTA' then 'Ejecutar inspección, registrar hallazgos y cerrar.'::text else 'Supervisar atraso o hallazgos relevantes.'::text end as role_action
  from public.canonical_hse_inspections_v1 h
  join cargo_ref c on c.organization_id=h.organization_id and c.cargo_name=any(array['JEFE SOSTENIBILIDAD'::text,'PREVENCIONISTA'::text])
  where lower(coalesce(h.status,''))=any(array['pendiente'::text,'pending'::text,'programada'::text,'scheduled'::text])
), hse_risk_tasks as (
  select c.organization_id,c.cargo_id,c.cargo_name,
    'risk:'||r.id::text as task_key,'hse'::text as domain,
    case when r.severity>=4 and coalesce(r.residual_risk_level,0)>=5 then 'critical'::text else 'warning'::text end as severity,
    case when r.severity>=4 and coalesce(r.residual_risk_level,0)>=5 then 95 when r.next_review_date<current_date then 80 else 65 end as priority_score,
    'Riesgo activo: '||coalesce(r.hazard_id,r.hazard_description,r.id::text) as title,
    concat_ws(' · ',nullif(r.hazard_description,''),nullif(r.process_or_area,''),'residual '||coalesce(r.residual_risk_level,0)::text,'próx. revisión '||coalesce(r.next_review_date::text,'sin fecha')) as evidence_summary,
    coalesce(r.status,'activo') as status,false as material_related,
    coalesce(r.next_review_date,r.last_review_date,r.created_at::date)::timestamptz as occurred_at,
    case when r.next_review_date<current_date then 'review_overdue_risk'::text else 'monitor_active_risk'::text end as recommended_action,
    case
      when r.severity>=4 and coalesce(r.residual_risk_level,0)>=5 and c.cargo_name='JEFE SOSTENIBILIDAD' then 'owner'::text
      when r.severity>=4 and coalesce(r.residual_risk_level,0)>=5 and c.cargo_name='PREVENCIONISTA' then 'support'::text
      when (r.next_review_date<current_date or r.severity>=4) and c.cargo_name='PREVENCIONISTA' then 'owner'::text
      when (r.next_review_date<current_date or r.severity>=4) and c.cargo_name='JEFE SOSTENIBILIDAD' then 'support'::text
      else 'none'::text end as responsibility,
    case when c.cargo_name='JEFE SOSTENIBILIDAD' then 'Aprobar respuesta y escalar si el riesgo compromete continuidad operacional.'::text else 'Revisar controles, actualizar evidencia y fecha de revisión.'::text end as role_action
  from public.canonical_hse_risks_v1 r
  join cargo_ref c on c.organization_id=r.organization_id and c.cargo_name=any(array['JEFE SOSTENIBILIDAD'::text,'PREVENCIONISTA'::text])
  where lower(coalesce(r.status,''))='activo' and (r.next_review_date<current_date or r.severity>=4)
)
select * from base
union all select * from hse_incident_tasks where responsibility<>'none'
union all select * from hse_inspection_tasks where responsibility<>'none'
union all select * from hse_risk_tasks where responsibility<>'none';

revoke all on public.operational_tasks_by_cargo_v4 from anon, authenticated;
grant select on public.operational_tasks_by_cargo_v4 to service_role;

comment on view public.hse_role_kpi_snapshot_v2 is
  'Tenant-safe HSE KPI baseline. Uses only explicitly tenant-mapped canonical incidents, inspections and risks; unmapped legacy rows are excluded.';
comment on view public.operational_tasks_by_cargo_v4 is
  'Operational task feed with HSE rows sourced only from tenant-safe canonical HSE views. Legacy unmapped HSE rows are excluded.';
