import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260914173000_add_tenant_safe_user_task_summary.sql', import.meta.url),
  'utf8',
);

test('tenant-safe user task summary depends only on v2 inbox', () => {
  assert.match(migration, /create or replace view public\.operational_task_inbox_summary_by_user_v2/);
  assert.match(migration, /from public\.operational_task_inbox_by_user_v2/);
  assert.doesNotMatch(
    migration.split('comment on view public.operational_task_inbox_summary_by_user_v1')[0],
    /from public\.operational_task_inbox_by_user_v1/,
  );
});

test('tenant-safe user task summary remains backend only', () => {
  assert.match(migration, /revoke all on public\.operational_task_inbox_summary_by_user_v2 from anon, authenticated/);
  assert.match(migration, /grant select on public\.operational_task_inbox_summary_by_user_v2 to service_role/);
});

test('legacy HSE-dependent views are deprecated without destructive drops', () => {
  for (const legacy of [
    'operational_task_inbox_summary_by_user_v1',
    'operational_task_inbox_by_user_v1',
    'operational_tasks_by_cargo_v3',
    'operational_tasks_by_cargo_summary_v3',
    'executive_operational_scorecard_v1',
  ]) {
    assert.match(migration, new RegExp(`comment on view public\\.${legacy}`));
  }
  assert.doesNotMatch(migration, /drop\s+(view|table)/i);
});
