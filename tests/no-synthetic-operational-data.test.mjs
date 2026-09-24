import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/production/sensors/route.ts', 'utf8');

test('production sensors use canonical asset and sensor evidence only', () => {
  assert.match(route, /canonical_assets_current/);
  assert.match(route, /canonical_asset_id/);
  assert.match(route, /availability_percentage:\s*null/);
  assert.match(route, /availability_evidence_status:\s*'insufficient_evidence'/);
  assert.doesNotMatch(route, /\.from\('equipment'\)/);
  assert.doesNotMatch(route, /equipment_sensors/);
  assert.doesNotMatch(route, /Math\.max\(60/);
  assert.doesNotMatch(route, /\?\s*96\s*:/);
});

test('synthetic data injectors are absent from the repository', () => {
  const forbidden = [
    'db/migrations/010-initial-data.sql',
    'db/migrations/015-seed-warehouse-and-documents.sql',
    'scripts/02_seed_vehicle_fault_tree.sql',
    'scripts/apply-warehouse-documents.ts',
    'scripts/insert-contracts.sql',
    'scripts/seed-audit-data.mjs',
    'scripts/seed-contracts-direct.ts',
    'scripts/seed-contracts.ts',
    'scripts/seed-legal-data.ts',
    'work/seed_expedient_records.sql',
  ];

  assert.deepEqual(forbidden.filter((path) => fs.existsSync(path)), []);
});
