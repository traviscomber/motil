import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260914164500_preserve_unknown_hse_scorecard_evidence.sql','utf8');

test('executive HSE metrics remain unknown without tenant-mapped canonical evidence', () => {
  assert.match(migration, /i\.incidents,/);
  assert.match(migration, /ins\.inspections,/);
  assert.match(migration, /r\.risks,/);
  assert.match(migration, /case when hse\.incidents is null or hse\.incidents=0 then null else hse\.injuries end/);
  assert.match(migration, /case when hse\.risks is null or hse\.risks=0 then null else hse\.overdue_risks end/);
  assert.doesNotMatch(migration, /coalesce\(i\.injuries,0\)/i);
  assert.doesNotMatch(migration, /coalesce\(r\.overdue_risks,0\)/i);
});

test('executive HSE rates require canonical rows before producing a value', () => {
  assert.match(migration, /case when hse\.incidents is null or hse\.incidents=0 then null else hse\.open_incidents\*100\/hse\.incidents end/);
  assert.match(migration, /case when hse\.inspections is null or hse\.inspections=0 then null else hse\.completed_inspections\*100\/hse\.inspections end/);
});

test('scorecard remains tenant-safe and backend only', () => {
  assert.match(migration, /from public\.canonical_hse_incidents_v1/);
  assert.match(migration, /from public\.canonical_hse_inspections_v1/);
  assert.match(migration, /from public\.canonical_hse_risks_v1/);
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /revoke all on public\.executive_operational_scorecard_v2 from anon, authenticated/);
  assert.match(migration, /grant select on public\.executive_operational_scorecard_v2 to service_role/);
});
