import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = new URL(
  '../supabase/migrations/20260914172000_restrict_legacy_hse_read_models.sql',
  import.meta.url,
)

const sql = (await readFile(migrationPath, 'utf8')).toLowerCase()

const legacyViews = [
  'hse_role_kpi_snapshot_v1',
  'executive_operational_scorecard_v1',
  'operational_tasks_by_cargo_v3',
  'operational_tasks_by_cargo_summary_v3',
  'operational_task_inbox_by_user_v1',
  'operational_task_inbox_summary_by_user_v1',
]

test('legacy HSE read models are backend select-only', () => {
  for (const view of legacyViews) {
    assert.match(
      sql,
      new RegExp(`revoke all on public\\.${view} from anon, authenticated, service_role;`),
    )
    assert.match(
      sql,
      new RegExp(`grant select on public\\.${view} to service_role;`),
    )
  }
})

test('legacy HSE read models are explicitly deprecated in database comments', () => {
  for (const view of legacyViews) {
    assert.match(sql, new RegExp(`comment on view public\\.${view}`))
  }
  assert.match(sql, /do not use for new consumers/)
})

test('cleanup is non-destructive', () => {
  assert.doesNotMatch(sql, /drop\s+(view|table)/)
  assert.doesNotMatch(sql, /delete\s+from/)
  assert.doesNotMatch(sql, /truncate\s+table/)
  assert.doesNotMatch(sql, /update\s+public\./)
})
