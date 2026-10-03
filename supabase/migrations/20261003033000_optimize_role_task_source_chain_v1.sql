-- Consolidate the active operational task source chain.
-- Keeps v6/v7/v8 intact for rollback while avoiding repeated production freshness scans.

create or replace view public.operational_tasks_by_cargo_v9
with (security_invoker=true) as
with production_freshness as (
  select org.organization_id,
         t.transport_date,
         p.plant_date,
         d.drilling_date
  from (
    select organization_id from public.production_material_movements
    union
    select organization_id from public.production_metallurgy_deterministic_v2
    union
    select organization_id from public.production_drilling_source_reports
  ) org
  left join (
    select organization_id, max(movement_date)::date as transport_date
    from public.production_material_movements
    group by organization_id
  ) t using (organization_id)
  left join (
    select organization_id, max(operation_date)::date as plant_date
    from public.production_metallurgy_deterministic_v2
    group by organization_id
  ) p using (organization_id)
  left join (
    select organization_id, max(operation_date)::date as drilling_date
    from public.production_drilling_source_reports
    group by organization_id
  ) d using (organization_id)
), maintenance_identity as (
  select organization_id,
         count(*)::bigint as affected,
         min(created_at)::timestamptz as occurred_at
  from public.maintenance_work_orders
  where canonical_asset_id is null
    and lower(coalesce(status,'')) not in ('completed','closed','cancelled','canceled')
  group by organization_id
), inventory_health as (
  select organization_id,
         count(*) filter (where quantity < 0)::bigint as negative_count,
         max(snapshot_date)::date as snapshot_date
  from public.canonical_inventory_current
  group by organization_id
), candidate as (
  select * from public.operational_tasks_by_cargo_v5

  union all

  select m.organization_id,c.id,c.name,
         'data_health:maintenance:missing_asset'::text,
         'maintenance'::text,
         'critical'::text,
         95,
         'Resolver OT activas sin activo canónico'::text,
         m.affected::text||' OT activa(s) sin activo canónico'::text,
         'pending'::text,
         false,
         m.occurred_at,
         'resolve_work_order_asset_identity'::text,
         'owner'::text,
         'Resolver la identidad del equipo antes de usar la OT en inteligencia de confiabilidad o causa raíz.'::text
  from maintenance_identity m
  join public.cargos c on upper(c.name)=upper('Jefe Departamento de Mantenimiento')
  where m.affected>0

  union all

  select i.organization_id,c.id,c.name,
         'data_health:inventory:negative_stock'::text,
         'inventory'::text,
         'critical'::text,
         90,
         'Conciliar stock negativo'::text,
         i.negative_count::text||' producto(s) con stock negativo en el snapshot canónico'::text,
         'pending'::text,
         true,
         i.snapshot_date::timestamptz,
         'reconcile_negative_inventory'::text,
         'owner'::text,
         'Conciliar movimientos y saldo antes de usar disponibilidad para decisiones de abastecimiento.'::text
  from inventory_health i
  join public.cargos c on upper(c.name)='JEFE BODEGA'
  where i.negative_count>0

  union all

  select i.organization_id,c.id,c.name,
         'data_health:inventory:freshness'::text,
         'inventory'::text,
         case when i.snapshot_date is null or current_date-i.snapshot_date>14 then 'critical' else 'warning' end,
         case when i.snapshot_date is null or current_date-i.snapshot_date>14 then 90 else 65 end,
         'Actualizar snapshot de Inventario'::text,
         'Último snapshot: '||coalesce(i.snapshot_date::text,'sin dato'),
         'pending'::text,
         false,
         i.snapshot_date::timestamptz,
         'refresh_inventory_snapshot'::text,
         'owner'::text,
         'Actualizar inventario antes de interpretar stock disponible, reposición o cobertura.'::text
  from inventory_health i
  join public.cargos c on upper(c.name)='JEFE BODEGA'
  where i.snapshot_date is null or current_date-i.snapshot_date>7

  union all

  select pf.organization_id,c.id,c.name,
         'data_health:production:transport_freshness'::text,
         'plant'::text,
         case when pf.transport_date is null or current_date-pf.transport_date>14 then 'critical' else 'warning' end,
         case when pf.transport_date is null or current_date-pf.transport_date>14 then 95 else 70 end,
         'Actualizar fuente de Transporte'::text,
         'Último dato de Transporte: '||coalesce(pf.transport_date::text,'sin dato'),
         'pending'::text,
         false,
         pf.transport_date::timestamptz,
         'refresh_production_transport_source'::text,
         'owner'::text,
         'Actualizar Transporte antes de usar ritmo, forecast o excepciones como lectura actual.'::text
  from production_freshness pf
  join public.cargos c on upper(c.name)='JEFE PLANTA'
  where pf.transport_date is null or current_date-pf.transport_date>7

  union all

  select pf.organization_id,c.id,c.name,
         'data_health:production:plant_freshness'::text,
         'plant'::text,
         case when pf.plant_date is null or current_date-pf.plant_date>14 then 'critical' else 'warning' end,
         case when pf.plant_date is null or current_date-pf.plant_date>14 then 95 else 70 end,
         'Actualizar fuente de Planta'::text,
         'Último dato de Planta: '||coalesce(pf.plant_date::text,'sin dato'),
         'pending'::text,
         false,
         pf.plant_date::timestamptz,
         'refresh_production_plant_source'::text,
         'owner'::text,
         'Actualizar Planta antes de usar recuperación, leyes o producción como lectura actual.'::text
  from production_freshness pf
  join public.cargos c on upper(c.name)='JEFE PLANTA'
  where pf.plant_date is null or current_date-pf.plant_date>7

  union all

  select pf.organization_id,c.id,c.name,
         'data_health:production:drilling_freshness'::text,
         'drilling'::text,
         case when pf.drilling_date is null or current_date-pf.drilling_date>14 then 'critical' else 'warning' end,
         case when pf.drilling_date is null or current_date-pf.drilling_date>14 then 95 else 70 end,
         'Actualizar fuente de Sondaje'::text,
         'Último dato de Sondaje: '||coalesce(pf.drilling_date::text,'sin dato'),
         'pending'::text,
         false,
         pf.drilling_date::timestamptz,
         'refresh_production_drilling_source'::text,
         'owner'::text,
         'Actualizar la fuente propia de Sondaje; el master de Transporte/Planta no reemplaza esta evidencia.'::text
  from production_freshness pf
  join public.cargos c on upper(c.name)='JEFE SONDAJE'
  where pf.drilling_date is null or current_date-pf.drilling_date>7
)
select t.*
from candidate t
where not (
  t.task_key like 'drilling_maintenance:%'
  and exists (
    select 1
    from public.operational_maintenance_reviews r
    where r.organization_id=t.organization_id
      and r.source_report_id::text=split_part(t.task_key,':',2)
      and r.status='pending'
  )
);

revoke all on public.operational_tasks_by_cargo_v9 from public, anon, authenticated;
grant select on public.operational_tasks_by_cargo_v9 to service_role;

create or replace view public.role_tasks_by_cargo_v1
with (security_invoker=true) as
select t.organization_id,t.cargo_id,t.cargo_name,t.task_key,t.domain,t.severity,t.priority_score,t.title,t.evidence_summary,t.status,t.material_related,t.occurred_at,t.recommended_action,t.responsibility,t.role_action,'operational'::text as visibility_scope
from public.operational_tasks_by_cargo_v9 t
union all
select f.organization_id,c.id,c.name,
       'finance:'::text||coalesce(f.alert_code,md5(coalesce(f.title,''::text))),
       'finance'::text,
       coalesce(f.severity,'warning'::text),
       case lower(coalesce(f.severity,'warning'::text)) when 'critical' then 95 when 'warning' then 60 else 30 end,
       f.title,
       concat_ws(' · ',nullif(f.description,''),'casos '||coalesce(f.exception_count,0)::text),
       'pending'::text,
       false,
       null::timestamptz,
       'review_finance_exception'::text,
       'owner'::text,
       'Resolver dentro de Administración; no escalar al tablero operacional salvo impacto demostrado.'::text,
       'role_private'::text
from public.canonical_finance_alerts f
join public.cargos c on upper(c.name)='JEFE ADM.'
where coalesce(f.exception_count,0)>0
union all
select r.organization_id,c.id,c.name,
       'reorder:'::text||r.id::text,
       'inventory'::text,
       'warning'::text,
       60,
       'Revisar reposición de inventario'::text,
       concat_ws(' · ','actual '||coalesce(r.current_value,0)::text,'umbral '||coalesce(r.threshold_value,0)::text),
       coalesce(r.status,'pending'::text),
       true,
       r.created_at::timestamptz,
       'review_reorder_alert'::text,
       'owner'::text,
       'Revisar en Bodega. Sólo escalar si bloquea una OT u operación activa.'::text,
       'role_private'::text
from public.reorder_alerts r
join public.cargos c on upper(c.name)='JEFE BODEGA'
where coalesce(r.status,'pending'::text)<>all(array['resolved','closed','dismissed','acknowledged']);

revoke all on public.role_tasks_by_cargo_v1 from public, anon, authenticated;
grant select on public.role_tasks_by_cargo_v1 to service_role;

comment on view public.operational_tasks_by_cargo_v9 is
  'Active MOTIL operational task source. Consolidates v6/v7 data-health logic without repeated production freshness expansion; v6-v8 remain available for rollback.';
