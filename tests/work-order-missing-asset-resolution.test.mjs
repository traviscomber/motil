import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const queue = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
const migration = await readFile(
  new URL('../supabase/migrations/20261002233500_audit_missing_work_order_asset_resolution.sql', import.meta.url),
  'utf8',
);

test('missing-asset data-health route lands on a focused work-order queue', () => {
  assert.match(queue, /searchParams\.get\('dataHealth'\) === 'missing_asset'/);
  assert.match(queue, /const matchesDataHealth = !missingAssetOnly \|\| !order\.asset_name/);
});

test('work-order API only permits filling a missing canonical asset', () => {
  assert.match(route, /canonical_asset_id\?: string \| null/);
  assert.match(route, /El equipo seleccionado no existe o no está activo en esta organización/);
  assert.match(route, /Una OT completada no puede cambiar su identidad de equipo/);
  assert.match(route, /La OT ya tiene un equipo canónico\. Usa el flujo de reconciliación para cambiarlo/);
  assert.match(route, /resolve_missing_work_order_asset_identity_v1/);
  assert.match(migration, /asset_identity_resolved/);
  assert.match(migration, /work_order_events/);
  assert.match(migration, /revoke execute[\s\S]*from anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
});

test('planning detail can resolve missing asset and blocks readiness until identity exists', () => {
  assert.match(detail, /needsAssetResolution/);
  assert.match(detail, /\/api\/maintenance\/equipment/);
  assert.match(detail, /patchOrder\(\{ canonical_asset_id: assetId \}\)/);
  assert.match(detail, /workOrder\.canonical_asset_id && workOrder\.assigned_person_id && workOrder\.cost_center_id/);
  assert.match(detail, /Resolver identidad del equipo/);
  assert.match(detail, /workOrder\.canonical_asset_id \? \(/);
});
