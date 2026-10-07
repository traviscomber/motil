import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const component = await readFile(new URL('../components/maintenance/work-order-evidence-and-approval.tsx', import.meta.url), 'utf8');
const reviewRoute = await readFile(new URL('../app/api/maintenance/work-orders/[id]/review/route.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261007033500_work_order_supervisor_reviews.sql', import.meta.url), 'utf8');

test('completed OT shows a durable evidence list', () => {
  assert.match(component, /Evidencia fotográfica/);
  assert.match(component, /\/evidence/);
  assert.match(component, /photo\.signed_url/);
  assert.match(component, /photo\.file_name/);
});

test('approval is explicitly limited to the canonical planning and equipment leadership cargos', () => {
  assert.match(reviewRoute, /jefe de planificación/);
  assert.match(reviewRoute, /jefe de equipos móviles y estacionarios/);
  assert.match(reviewRoute, /Solo Planificación o Jefatura de Equipos puede aprobar la OT/);
  assert.match(reviewRoute, /status: 'approved'/);
});

test('approval is separate from execution truth and is audited', () => {
  assert.match(migration, /work_order_supervisor_reviews/);
  assert.match(migration, /unique \(organization_id, work_order_id\)/);
  assert.match(reviewRoute, /event_type: 'supervisor_approved'/);
  assert.match(component, /Pendiente de aprobación/);
});
