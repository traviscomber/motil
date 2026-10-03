import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/route.ts', import.meta.url), 'utf8');
const form = await readFile(new URL('../components/maintenance/create-work-order.tsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261002224000_accept_and_create_review_work_order.sql', import.meta.url), 'utf8');
const dictionary = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');
const drillingRoute = await readFile(new URL('../app/api/produccion/sondaje/mantenimiento/route.ts', import.meta.url), 'utf8');
const drillingReviews = await readFile(new URL('../components/production/operational-maintenance-reviews.tsx', import.meta.url), 'utf8');
const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const handoffMigration = await readFile(new URL('../supabase/migrations/20261002231500_split_drilling_review_handoff.sql', import.meta.url), 'utf8');

test('non-critical pending drilling reviews require explicit human acceptance', () => {
  assert.match(route, /pendingReviewNeedsAcceptance/);
  assert.match(route, /pendingReviewNeedsAcceptance && !acceptReview/);
  assert.match(route, /Confirma la aceptación de la revisión antes de crear la orden/);
  assert.match(route, /accept_and_create_work_order_from_operational_review_v1/);
});

test('acceptance and work-order creation are atomic and server-only', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /status = 'accepted'/);
  assert.match(migration, /create_work_order_from_operational_review/);
  assert.match(migration, /revoke execute[\s\S]*from anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
});

test('work-order UI makes acceptance explicit before submitting', () => {
  assert.match(form, /reviewNeedsAcceptance/);
  assert.match(form, /acceptReview: reviewNeedsAcceptance/);
  assert.match(form, /t\.reviewCard\.pendingAcceptance/);
  assert.match(form, /t\.acceptAndCreate/);
  assert.match(dictionary, /acceptAndCreate: 'Aceptar revisión y crear OT'/);
  assert.match(dictionary, /acceptAndCreate: 'Accept review and create WO'/);
});


test('Sondaje can accept a pending warning without receiving Maintenance write access', () => {
  assert.match(drillingRoute, /export async function PATCH/);
  assert.match(drillingRoute, /PROD_SONDAJE_PRODUCCION, true/);
  assert.match(drillingRoute, /status: 'accepted'/);
  assert.match(drillingRoute, /Una condición fuera de servicio debe ser atendida directamente por Mantención/);
  assert.match(drillingReviews, /Aceptar para Mantención/);
});

test('accepted drilling reviews hand ownership to Maintenance', () => {
  assert.match(handoffMigration, /a_1\.status = 'accepted'/);
  assert.match(handoffMigration, /Jefe Departamento de Mantenimiento/);
  assert.match(handoffMigration, /Jefe de Planificación/);
  assert.match(handoffMigration, /Jefe de Equipos Móviles y Estacionarios/);
});

test('pending drilling owner task opens the exact review in the drilling workspace', () => {
  assert.match(inbox, /task\.cargo_name \|\| ''\)\.toUpperCase\(\) === 'JEFE SONDAJE'/);
  assert.match(inbox, /produccion\/sondaje\/produccion\?reviewId=/);
  assert.match(drillingReviews, /useSearchParams/);
  assert.match(drillingReviews, /searchParams\.get\('reviewId'\)/);
  assert.match(drillingReviews, /row\.id === focusReviewId/);
});
