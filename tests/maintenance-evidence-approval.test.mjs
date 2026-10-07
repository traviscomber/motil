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

test('approval follows maintenance edit authority and supports audited self-approval', () => {
  assert.match(reviewRoute, /accessLevel !== 'ED'/);
  assert.match(reviewRoute, /isSelfApproval/);
  assert.match(reviewRoute, /work_order_self_approved/);
  assert.match(reviewRoute, /supervisor_person_id/);
  assert.match(reviewRoute, /status: 'approved'/);
});

test('approval is separate from execution truth and is audited', () => {
  assert.match(migration, /work_order_supervisor_reviews/);
  assert.match(migration, /unique \(organization_id, work_order_id\)/);
  assert.match(reviewRoute, /event_type: 'supervisor_approved'/);
  assert.match(component, /Pendiente de aprobación/);
  assert.match(component, /Se avisará a tu superior/);
});
