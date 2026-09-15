import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260915093000_harden_trigger_function_execute.sql', 'utf8');

const hardenedFunctions = [
  'capture_motil_ai_decision_case_event',
  'enforce_motil_production_batch_source',
  'enforce_work_order_lifecycle_assignment',
  'handle_alarm_created',
  'handle_equipment_status_change',
  'handle_incident_reported',
  'handle_sensor_anomaly',
  'set_lean_andon_updated_at',
  'sync_canonical_procurement_order_trigger_v1',
  'sync_work_order_external_cost',
  'update_maintenance_expedient_records_updated_at',
  'update_module_documents_updated_at',
];

test('client roles lose direct execute on audited trigger functions', () => {
  for (const fn of hardenedFunctions) {
    assert.match(
      migration,
      new RegExp(`revoke execute on function public\\.${fn}\\(\\) from public, anon, authenticated`, 'i'),
    );
  }
});

test('service role retains explicit backend execute access', () => {
  for (const fn of hardenedFunctions) {
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${fn}\\(\\) to service_role`, 'i'),
    );
  }
});

test('cleanup is privilege-only and does not drop or rewrite operational data', () => {
  assert.doesNotMatch(migration, /drop\s+(?:function|table|view)/i);
  assert.doesNotMatch(migration, /delete\s+from/i);
  assert.doesNotMatch(migration, /update\s+public\./i);
  assert.doesNotMatch(migration, /insert\s+into/i);
});

test('unattached legacy event handlers are explicitly documented', () => {
  for (const fn of [
    'handle_alarm_created',
    'handle_equipment_status_change',
    'handle_incident_reported',
    'handle_sensor_anomaly',
  ]) {
    assert.match(migration, new RegExp(`comment on function public\\.${fn}\\(\\)`, 'i'));
    assert.match(migration, /not attached to a trigger as of 2026-09-15/i);
  }
});
