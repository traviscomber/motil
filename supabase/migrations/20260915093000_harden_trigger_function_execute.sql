-- Harden trigger-function EXECUTE privileges.
-- Trigger runtime does not require client EXECUTE permission; these functions remain available
-- to PostgreSQL triggers while direct anon/authenticated execution is removed.

revoke execute on function public.capture_motil_ai_decision_case_event() from public, anon, authenticated;
revoke execute on function public.enforce_motil_production_batch_source() from public, anon, authenticated;
revoke execute on function public.enforce_work_order_lifecycle_assignment() from public, anon, authenticated;
revoke execute on function public.handle_alarm_created() from public, anon, authenticated;
revoke execute on function public.handle_equipment_status_change() from public, anon, authenticated;
revoke execute on function public.handle_incident_reported() from public, anon, authenticated;
revoke execute on function public.handle_sensor_anomaly() from public, anon, authenticated;
revoke execute on function public.set_lean_andon_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_canonical_procurement_order_trigger_v1() from public, anon, authenticated;
revoke execute on function public.sync_work_order_external_cost() from public, anon, authenticated;
revoke execute on function public.update_maintenance_expedient_records_updated_at() from public, anon, authenticated;
revoke execute on function public.update_module_documents_updated_at() from public, anon, authenticated;

-- Keep backend/operator access explicit for diagnostics and migrations.
grant execute on function public.capture_motil_ai_decision_case_event() to service_role;
grant execute on function public.enforce_motil_production_batch_source() to service_role;
grant execute on function public.enforce_work_order_lifecycle_assignment() to service_role;
grant execute on function public.handle_alarm_created() to service_role;
grant execute on function public.handle_equipment_status_change() to service_role;
grant execute on function public.handle_incident_reported() to service_role;
grant execute on function public.handle_sensor_anomaly() to service_role;
grant execute on function public.set_lean_andon_updated_at() to service_role;
grant execute on function public.sync_canonical_procurement_order_trigger_v1() to service_role;
grant execute on function public.sync_work_order_external_cost() to service_role;
grant execute on function public.update_maintenance_expedient_records_updated_at() to service_role;
grant execute on function public.update_module_documents_updated_at() to service_role;

comment on function public.handle_alarm_created() is
  'Legacy trigger handler retained for compatibility; not attached to a trigger as of 2026-09-15 and not executable by client roles.';
comment on function public.handle_equipment_status_change() is
  'Legacy trigger handler retained for compatibility; not attached to a trigger as of 2026-09-15 and not executable by client roles.';
comment on function public.handle_incident_reported() is
  'Legacy trigger handler retained for compatibility; not attached to a trigger as of 2026-09-15 and not executable by client roles.';
comment on function public.handle_sensor_anomaly() is
  'Legacy trigger handler retained for compatibility; not attached to a trigger as of 2026-09-15 and not executable by client roles.';
