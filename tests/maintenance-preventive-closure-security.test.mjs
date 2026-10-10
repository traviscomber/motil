import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261010100000_allow_preventive_ot_closure_without_root_cause.sql', import.meta.url), 'utf8');
const permissionBlock = migration.split('select (')[1]?.split(') into v_authorized;')[0] ?? '';

test('closing an OT never grants permission from organization membership alone', () => {
  assert.ok(permissionBlock, 'missing authorization predicate');
  assert.doesNotMatch(permissionBlock, /from public\.user_roles\s+ur\s+where\s+ur\.user_id\s*=\s*v_actor/);
  assert.match(permissionBlock, /p\.organization_id = v_wo\.organization_id/);
  assert.match(permissionBlock, /p\.status, 'active'/);
  assert.match(permissionBlock, /rm\.module_key = 'mant_operaciones'/);
  assert.match(permissionBlock, /rm\.access_level = 'ED'/);
  assert.match(permissionBlock, /pe\.organization_id = v_wo\.organization_id/);
  assert.match(permissionBlock, /pe\.employment_status = 'active'/);
  assert.match(permissionBlock, /pe\.id = v_wo\.assigned_person_id/);
});

test('preventive closure does not fabricate failure diagnosis, corrective closure still requires it', () => {
  assert.match(migration, /not in \('preventive', 'preventivo'\) and coalesce\(trim\(v_wo\.root_cause\)/);
  assert.match(migration, /not in \('preventive', 'preventivo'\) and coalesce\(trim\(v_wo\.preventive_actions\)/);
  assert.match(migration, /in \('correctivo','corrective'\) and not v_has_runtime_evidence/);
  assert.match(migration, /v_wo\.actual_duration_hours/);
  assert.match(migration, /v_pending_plan_steps > 0/);
});

test('closure never implicitly reconciles materials and preserves audit records', () => {
  assert.doesNotMatch(migration, /update public\.work_order_supply_needs/i);
  assert.match(migration, /insert into public\.work_order_closure_cost_snapshots/);
  assert.match(migration, /insert into public\.work_order_events/);
  assert.match(migration, /'material_reconciliation_deferred', true/);
});
