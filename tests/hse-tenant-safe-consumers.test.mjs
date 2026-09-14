import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260914163000_rewire_tenant_safe_hse_consumers.sql','utf8');

test('executive scorecard HSE reads only canonical tenant-scoped sources', () => {
  assert.match(migration, /executive_operational_scorecard_v2/);
  assert.match(migration, /from public\.canonical_hse_incidents_v1/);
  assert.match(migration, /from public\.canonical_hse_inspections_v1/);
  assert.match(migration, /from public\.canonical_hse_risks_v1/);
  assert.doesNotMatch(migration, /from public\.incidents\b/);
  assert.doesNotMatch(migration, /from public\.hse_inspections\b/);
  assert.doesNotMatch(migration, /from public\.risk_matrix\b/);
  assert.match(migration, /left join hse on hse\.organization_id=o\.organization_id/);
});

test('user inbox consumes the tenant-safe cargo task feed', () => {
  assert.match(migration, /operational_task_inbox_by_user_v2/);
  assert.match(migration, /join public\.operational_tasks_by_cargo_v4 t on t\.organization_id=p\.organization_id and t\.cargo_id=p\.cargo_id/);
  assert.doesNotMatch(migration, /join public\.operational_tasks_by_cargo_v3\b/);
});

test('cargo summary consumes the tenant-safe cargo task feed', () => {
  assert.match(migration, /operational_tasks_by_cargo_summary_v4/);
  assert.match(migration, /from public\.operational_tasks_by_cargo_v4/);
  assert.doesNotMatch(migration, /from public\.operational_tasks_by_cargo_v3\b/);
});

test('new downstream read models remain backend only', () => {
  for (const view of ['executive_operational_scorecard_v2','operational_task_inbox_by_user_v2','operational_tasks_by_cargo_summary_v4']) {
    assert.match(migration, new RegExp(`revoke all on public\\.${view} from anon, authenticated`));
    assert.match(migration, new RegExp(`grant select on public\\.${view} to service_role`));
  }
});

test('tenant-safe consumer migration does not mutate legacy HSE source rows', () => {
  assert.doesNotMatch(migration, /update\s+public\.(?:incidents|hse_inspections|risk_matrix)/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.(?:incidents|hse_inspections|risk_matrix)/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(?:incidents|hse_inspections|risk_matrix)/i);
});
