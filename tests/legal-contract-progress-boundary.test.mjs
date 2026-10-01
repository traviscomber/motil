import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260930161000_add_contract_progress_updates.sql', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/legal/contract-progress/route.ts', import.meta.url), 'utf8');

test('contract progress ledger is tenant-scoped and evidence-linked', () => {
  assert.match(migration, /organization_id uuid not null references public\.organizations/i);
  assert.match(migration, /contract_id uuid not null references public\.contracts/i);
  assert.match(migration, /evidence_document_id uuid references public\.module_documents/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /contract_progress_updates_org_isolation/i);
});

test('approved contract progress requires evidence and updates the aggregate contract progress', () => {
  assert.match(route, /No se puede aprobar un avance sin evidencia documental vinculada/i);
  assert.match(route, /decision === 'approved'/i);
  assert.match(route, /execution_percentage: Number\(current\.execution_percentage\)/i);
  assert.match(route, /eq\('organization_id', auth\.context\.organizationId\)/i);
});

test('contract progress endpoint exposes a safe schema-not-ready state before production migration', () => {
  assert.match(route, /error\.code === '42P01'/i);
  assert.match(route, /schemaReady: false/i);
});
