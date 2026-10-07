import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const queueRoute = await readFile(new URL('../app/api/maintenance/work-order-close-queue/route.ts', import.meta.url), 'utf8');
const reviewRoute = await readFile(new URL('../app/api/maintenance/work-orders/[id]/review/route.ts', import.meta.url), 'utf8');
const notificationsRoute = await readFile(new URL('../app/api/maintenance/notifications/route.ts', import.meta.url), 'utf8');
const maintenanceLayout = await readFile(new URL('../app/dashboard/mantenimiento/layout.tsx', import.meta.url), 'utf8');

test('closure queue is personal even for edit-level maintenance users', () => {
  assert.match(queueRoute, /eq\('profile_id', context\.userId\)/);
  assert.match(queueRoute, /eq\('assigned_person_id', person\.id\)/);
  assert.match(queueRoute, /scope: person \? 'assigned_to_me' : 'organization'/);
});

test('closure queue only includes active execution, not every open OT', () => {
  assert.match(queueRoute, /eq\('status', 'in_progress'\)/);
  assert.doesNotMatch(queueRoute, /not\('status', 'in'/);
});

test('self-approval notifies the canonical supervisor', () => {
  assert.match(reviewRoute, /supervisor_person_id/);
  assert.match(reviewRoute, /maintenance_notifications/);
  assert.match(reviewRoute, /work_order_self_approved/);
  assert.match(reviewRoute, /self_approved_supervisor_notified/);
});

test('maintenance notifications are user-scoped and visible in the workspace', () => {
  assert.match(notificationsRoute, /recipient_profile_id/);
  assert.match(notificationsRoute, /context\.userId/);
  assert.match(maintenanceLayout, /Aviso de mantenimiento/);
  assert.match(maintenanceLayout, /Visto/);
});
