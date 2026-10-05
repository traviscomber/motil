import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261005173000_scope_role_task_rpc_validation_v1.sql', import.meta.url),
  'utf8'
);

test('role-task RPCs do not validate through the monolithic worklist', () => {
  assert.doesNotMatch(migration, /role_task_worklist_v1/);
  assert.match(migration, /role_tasks_actionable_v1/);
  assert.match(migration, /role_task_escalations_v1/);
});

test('task resolution remains owner-only', () => {
  const resolver = migration.match(/create or replace function public\.resolve_role_task\([\s\S]+?\$function\$;/i)?.[0] || '';
  const legacy = migration.match(/create or replace function public\.resolve_role_task_legacy_unscoped\([\s\S]+?\$function\$;/i)?.[0] || '';
  assert.match(resolver, /responsibility = 'owner'/);
  assert.match(legacy, /responsibility = 'owner'/);
});

test('personal task state preserves actionable and escalation visibility', () => {
  assert.match(migration, /create or replace function public\.set_my_operational_task_state/);
  assert.match(migration, /create or replace function public\.set_role_task_personal_state/);
  assert.match(migration, /if not v_visible then[\s\S]+role_task_escalations_v1/);
});

test('RPC execution grants remain least-privilege compatible', () => {
  assert.match(migration, /resolve_role_task_legacy_unscoped[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /resolve_role_task_legacy_unscoped[\s\S]+to service_role/);
  assert.match(migration, /set_my_operational_task_state[\s\S]+to authenticated, service_role/);
  assert.match(migration, /set_role_task_personal_state[\s\S]+to authenticated, service_role/);
});
