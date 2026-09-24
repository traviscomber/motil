import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260924014500_add_planning_asset_meter_observations_v1.sql',
  'utf8'
);

test('meter observation model collapses import duplicates without deleting source evidence', () => {
  assert.match(migration, /planning_asset_meter_observations_v1/);
  assert.match(migration, /distinct on/);
  assert.match(migration, /workbook_history/);
  assert.match(migration, /workbook_current/);
  assert.match(migration, /workbook_initial/);
  assert.match(migration, /evidence_row_count/);
  assert.match(migration, /security_invoker = true/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.planning_asset_meter_readings/i);
  assert.doesNotMatch(migration, /update\s+public\.planning_asset_meter_readings/i);
});
