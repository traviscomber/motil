import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const org = await readFile(new URL('../lib/api/organization-context.ts', import.meta.url), 'utf8');
const access = await readFile(new URL('../lib/maintenance/work-order-execution-access.ts', import.meta.url), 'utf8');
const workOrder = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const timer = await readFile(new URL('../app/api/maintenance/work-orders/[id]/timer/route.ts', import.meta.url), 'utf8');
const close = await readFile(new URL('../app/api/maintenance/work-orders/[id]/close/route.ts', import.meta.url), 'utf8');

test('assigned work-order execution bypass is narrow and excludes deletes', () => {
  assert.match(org, /method === 'PATCH'/);
  assert.match(org, /method === 'POST'/);
  assert.match(org, /\(timer\|close\)/);
  assert.doesNotMatch(org, /method === 'DELETE'.*work-orders/s);
});

test('non-elevated maintenance users are restricted to their assigned person identity', () => {
  assert.match(access, /profile_id', context\.userId/);
  assert.match(access, /assigned_person_id !== person\.id/);
  assert.match(access, /Sólo la persona asignada puede ejecutar esta orden de trabajo/);
});

test('assigned executor may only start status through generic work-order PATCH', () => {
  assert.match(workOrder, /requireAssignedMaintenanceExecution/);
  assert.match(workOrder, /mutationKeys\.length !== 1/);
  assert.match(workOrder, /body\.status !== 'in_progress'/);
});

test('timer and close enforce assigned executor identity', () => {
  assert.match(timer, /requireAssignedMaintenanceExecution/);
  assert.match(close, /requireAssignedMaintenanceExecution/);
});
