import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const reviewRoute = await readFile(new URL('../app/api/actions/shipment-review/[id]/route.ts', import.meta.url), 'utf8');
const reviewPage = await readFile(new URL('../app/dashboard/produccion/despachos/revision/[id]/page.tsx', import.meta.url), 'utf8');

test('role inbox deep-links shipment reviews to the canonical production workspace', () => {
  assert.match(inboxRoute, /kind === 'shipment_review'/);
  assert.match(inboxRoute, /produccion\/despachos\/revision\/\$\{rawId\}/);
});

test('shipment review API authorizes by tenant, cargo and visible task before loading shipment', () => {
  assert.match(reviewRoute, /getVisibleScopedRoleTask/);
  assert.doesNotMatch(reviewRoute, /role_task_frontend_v1/);
  assert.match(reviewRoute, /organizationId: context\.organizationId/);
  assert.match(reviewRoute, /cargoId: profile\.cargo_id/);
  assert.match(reviewRoute, /taskKey,/);
  assert.match(reviewRoute, /\.from\('production_concentrate_shipments'\)/);
  assert.match(reviewRoute, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(reviewRoute, /authorizationBoundary: 'scoped_role_task_sources_v1'/);
});

test('shipment review workspace preserves source fidelity and remains read-only', () => {
  assert.match(reviewPage, /Ley despacho/);
  assert.match(reviewPage, /Regla de normalización/);
  assert.match(reviewPage, /No completa una ley faltante ni calcula fino/);
  assert.doesNotMatch(reviewPage, /method:\s*['\"](?:POST|PATCH|PUT|DELETE)['\"]/);
});
