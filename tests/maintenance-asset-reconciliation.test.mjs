import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260924013000_add_maintenance_asset_reconciliation_v1.sql',
  'utf8'
);
const route = fs.readFileSync('app/api/maintenance/data-quality/assets/route.ts', 'utf8');

test('asset reconciliation model is read-only and tenant-scoped', () => {
  assert.match(migration, /maintenance_asset_reconciliation_v1/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /a\.is_active = true/);
  assert.match(migration, /deterministic_candidate/);
  assert.match(migration, /review_required/);
  assert.match(migration, /revoke all on public\.maintenance_asset_reconciliation_v1 from anon, authenticated/);
  assert.doesNotMatch(migration, /update\s+canonical\.assets/i);
  assert.doesNotMatch(migration, /delete\s+from\s+canonical\.assets/i);
});

test('asset reconciliation API never mutates the master', () => {
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /mutationExecuted: false/);
  assert.match(route, /\.limit\(MAX_ROWS\)/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.delete\(/);
});
