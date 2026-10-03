import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const helper = await readFile(new URL('../lib/actions/scoped-role-task.ts', import.meta.url), 'utf8');
const hse = await readFile(new URL('../app/api/actions/hse-record/[kind]/[id]/route.ts', import.meta.url), 'utf8');
const shipment = await readFile(new URL('../app/api/actions/shipment-review/[id]/route.ts', import.meta.url), 'utf8');

test('record action authorization uses scoped task sources', () => {
  assert.match(helper, /role_tasks_actionable_v1/);
  assert.match(helper, /role_task_escalations_v1/);
  assert.match(helper, /user_action_states/);
  assert.doesNotMatch(helper, /role_task_frontend_v1/);
});

test('HSE and shipment action routes use the scoped authorization helper', () => {
  for (const source of [hse, shipment]) {
    assert.match(source, /getVisibleScopedRoleTask/);
    assert.match(source, /authorizationBoundary: 'scoped_role_task_sources_v1'/);
    assert.doesNotMatch(source, /role_task_frontend_v1/);
  }
});
