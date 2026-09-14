import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const route = fs.readFileSync('app/api/desempeno/scorecards/route.ts','utf8');

test('Desempeño reads tenant-safe HSE and executive scorecards', () => {
  assert.match(route, /from\('hse_role_kpi_snapshot_v2'\)/);
  assert.match(route, /from\('executive_operational_scorecard_v2'\)/);
  assert.doesNotMatch(route, /from\('hse_role_kpi_snapshot_v1'\)/);
  assert.doesNotMatch(route, /from\('executive_operational_scorecard_v1'\)/);
});

test('Desempeño keeps organization scoping on tenant-safe scorecards', () => {
  assert.match(route, /from\('hse_role_kpi_snapshot_v2'\)\.select\('\*'\)\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /from\('executive_operational_scorecard_v2'\)\.select\('\*'\)\.eq\('organization_id', context\.organizationId\)/);
});
