import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const casesApi = new URL('../app/api/legal/cases/route.ts', import.meta.url);
const syncApi = new URL('../app/api/legal/cases/sync/route.ts', import.meta.url);
const casesPage = new URL('../app/dashboard/legal/casos/page.tsx', import.meta.url);
const migration = new URL('../supabase/migrations/20260930152500_add_legal_operational_cases.sql', import.meta.url);

test('legal cases are tenant scoped and require Legal access', async () => {
  const source = await readFile(casesApi, 'utf8');
  assert.match(source, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(source, /\.eq\('organization_id', auth\.context\.organizationId\)/);
  assert.match(source, /auth\.access !== 'ED'/);
});

test('legal referral sync uses deterministic source types and preserves case workflow state', async () => {
  const source = await readFile(syncApi, 'utf8');
  assert.match(source, /event_type', 'legal'/);
  assert.match(source, /contract_review/);
  assert.match(source, /contract_expiry/);
  assert.match(source, /existingByKey/);
  assert.doesNotMatch(source, /status: 'new',[\s\S]*\.update\(/);
});

test('legal cases migration enables RLS and unique source deduplication', async () => {
  const source = await readFile(migration, 'utf8');
  assert.match(source, /unique \(organization_id, source_type, source_id\)/);
  assert.match(source, /enable row level security/);
  assert.match(source, /legal_cases_org_isolation/);
  assert.match(source, /to authenticated/);
});

test('Legal work center exposes operational owner legal owner and source', async () => {
  const source = await readFile(casesPage, 'utf8');
  assert.match(source, /Dueño operacional sin asignar/);
  assert.match(source, /Legal sin persona asignada/);
  assert.match(source, /Ver fuente/);
  assert.match(source, /Sincronizar/);
});
