import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260930214000_add_mineral_settlements.sql', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/legal/mineral-settlements/route.ts', import.meta.url), 'utf8');

test('mineral settlements keep operational shipments as canonical references', () => {
  assert.match(migration, /shipment_id uuid not null references public\.production_concentrate_shipments/i);
  assert.match(migration, /unique \(settlement_id, shipment_id\)/i);
  assert.match(route, /from\('production_concentrate_shipments'\)/i);
  assert.match(route, /Uno o más embarques no pertenecen a la organización/i);
});

test('mineral settlements isolate tenants and link canonical evidence', () => {
  assert.match(migration, /alter table public\.mineral_settlements enable row level security/i);
  assert.match(migration, /mineral_settlements_org_isolation/i);
  assert.match(migration, /settlement_document_id uuid references public\.module_documents/i);
  assert.match(route, /eq\('organization_id', auth\.context\.organizationId\)/i);
});

test('mineral settlements do not auto-create finance payments', () => {
  assert.doesNotMatch(route, /from\('finance_payment_requests'\)\s*\.insert/i);
  assert.match(migration, /payment_request_id uuid references public\.finance_payment_requests/i);
});
