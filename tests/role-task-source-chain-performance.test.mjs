import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261003033000_optimize_role_task_source_chain_v1.sql', import.meta.url),
  'utf8'
);

test('active operational task source is consolidated in v9', () => {
  assert.match(migration, /create or replace view public\.operational_tasks_by_cargo_v9/);
  assert.match(migration, /from public\.operational_tasks_by_cargo_v5/);
  assert.doesNotMatch(migration, /from public\.operational_tasks_by_cargo_v6/);
  assert.doesNotMatch(migration, /from public\.operational_tasks_by_cargo_v7/);
  assert.doesNotMatch(migration, /from public\.operational_tasks_by_cargo_v8/);
});

test('v9 preserves split production freshness tasks and review dedupe', () => {
  assert.match(migration, /data_health:production:transport_freshness/);
  assert.match(migration, /data_health:production:plant_freshness/);
  assert.match(migration, /data_health:production:drilling_freshness/);
  assert.match(migration, /operational_maintenance_reviews/);
  assert.match(migration, /drilling_maintenance:%/);
});

test('role task contract switches only the active operational source to v9', () => {
  assert.match(migration, /from public\.operational_tasks_by_cargo_v9 t/);
  assert.match(migration, /canonical_finance_alerts/);
  assert.match(migration, /reorder_alerts/);
});

test('client roles cannot read the backend source views directly', () => {
  assert.match(migration, /revoke all on public\.operational_tasks_by_cargo_v9 from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.operational_tasks_by_cargo_v9 to service_role/);
  assert.match(migration, /revoke all on public\.role_tasks_by_cargo_v1 from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.role_tasks_by_cargo_v1 to service_role/);
});
