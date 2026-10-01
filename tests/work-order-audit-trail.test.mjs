import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20261001150000_expand_work_order_audit_trail.sql',
  'utf8',
);

test('OT audit trigger keeps creation and meaningful field changes', () => {
  for (const eventType of [
    'work_order_created',
    'status_changed',
    'assignee_changed',
    'priority_changed',
    'cost_center_changed',
    'schedule_changed',
    'work_type_changed',
    'planned_hours_changed',
    'actual_hours_changed',
    'root_cause_changed',
    'preventive_actions_changed',
    'meter_changed',
  ]) {
    assert.match(migration, new RegExp("'"+eventType+"'"));
  }
});

test('OT audit payloads capture before and after values and actor identity', () => {
  assert.match(migration, /current_application_user_id\(\)/);
  assert.match(migration, /actor_name/);
  assert.match(migration, /'from'/);
  assert.match(migration, /'to'/);
  assert.match(migration, /source_table/);
  assert.match(migration, /source_record_id/);
});

test('OT audit does not emit events for updated_at-only changes', () => {
  assert.doesNotMatch(migration, /updated_at_changed/);
  assert.match(migration, /if new\.status is distinct from old\.status/);
});
