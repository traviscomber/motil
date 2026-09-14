import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = new URL(
  '../supabase/migrations/20260914173500_lockdown_legacy_hse_sources.sql',
  import.meta.url,
)

const sql = (await readFile(migrationPath, 'utf8')).toLowerCase()

test('legacy HSE sources are not directly exposed to client roles', () => {
  for (const table of ['incidents', 'risk_matrix', 'hse_inspections']) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`))
  }
})

test('unsafe inferred-tenant HSE policies are removed', () => {
  assert.match(sql, /drop policy if exists incidents_org_isolation on public\.incidents;/)
  assert.match(sql, /drop policy if exists risk_matrix_org_isolation on public\.risk_matrix;/)
})

test('legacy HSE sources remain preserved for controlled backend migration', () => {
  assert.doesNotMatch(sql, /drop\s+table/)
  assert.doesNotMatch(sql, /delete\s+from/)
  assert.doesNotMatch(sql, /truncate\s+table/)
  assert.doesNotMatch(sql, /update\s+public\./)
  assert.match(sql, /canonical_hse_incidents_v1/)
  assert.match(sql, /canonical_hse_risks_v1/)
})
