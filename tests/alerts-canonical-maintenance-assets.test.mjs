import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/api/alertas/route.ts', import.meta.url), 'utf8');

test('work-order alerts do not depend on the removed legacy PostgREST relationship', () => {
  assert.doesNotMatch(route, /asset:maintenance_assets\(asset_name\)/);
  assert.match(route, /canonical_asset_id/);
  assert.match(route, /maintenance_canonical_assets_v1/);
});

test('canonical asset lookup is tenant scoped and preserves an honest empty fallback', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /assetName: row\.canonical_asset_id \? assetNames\.get\(row\.canonical_asset_id\) \|\| null : null/);
  assert.match(route, /workOrder\.assetName \|\| 'equipo operativo'/);
});
