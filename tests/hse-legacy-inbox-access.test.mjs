import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260914170000_harden_legacy_hse_inbox_access.sql','utf8');

test('tenant-safe user summary is sourced only from inbox v2', () => {
  assert.match(migration, /operational_task_inbox_summary_by_user_v2/);
  assert.match(migration, /from public\.operational_task_inbox_by_user_v2/);
  assert.doesNotMatch(migration, /from public\.operational_task_inbox_by_user_v1/);
  assert.match(migration, /user_id as auth_user_id/);
  assert.match(migration, /profile_id/);
});

test('legacy inbox views are no longer directly readable by client roles', () => {
  for (const view of ['operational_task_inbox_by_user_v1','operational_task_inbox_summary_by_user_v1']) {
    assert.match(migration, new RegExp(`revoke all on public\\.${view} from anon, authenticated`));
    assert.match(migration, new RegExp(`grant select on public\\.${view} to service_role`));
  }
});

test('tenant-safe replacement remains backend only', () => {
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /revoke all on public\.operational_task_inbox_summary_by_user_v2 from anon, authenticated/);
  assert.match(migration, /grant select on public\.operational_task_inbox_summary_by_user_v2 to service_role/);
});

test('hardening does not drop views or mutate operational rows', () => {
  assert.doesNotMatch(migration, /drop\s+(?:view|table)/i);
  assert.doesNotMatch(migration, /delete\s+from/i);
  assert.doesNotMatch(migration, /update\s+public\./i);
  assert.doesNotMatch(migration, /insert\s+into/i);
});
