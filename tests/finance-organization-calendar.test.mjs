import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const calendarApi = new URL('../app/api/calendar/operational/route.ts', import.meta.url);
const calendarUi = new URL('../components/operational-calendar/comfortable-operational-calendar.tsx', import.meta.url);
const financeLayout = new URL('../app/dashboard/finanzas/layout.tsx', import.meta.url);
const migration = new URL('../supabase/migrations/20260930154000_harden_procurement_finance_rls.sql', import.meta.url);

test('organization calendar includes real finance payable due dates', async () => {
  const source = await readFile(calendarApi, 'utf8');
  assert.match(source, /'finance'/);
  assert.match(source, /procurement_accounts_payable/);
  assert.match(source, /Vencimiento de pago/);
  assert.match(source, /\/dashboard\/finanzas\/pagos/);
  assert.match(source, /reconciled/);
});

test('organization calendar UI exposes Finance as a source', async () => {
  const source = await readFile(calendarUi, 'utf8');
  assert.match(source, /Finanzas/);
  assert.match(source, /summary\.by_source\.finance/);
});

test('Finance navigation exposes document center', async () => {
  const source = await readFile(financeLayout, 'utf8');
  assert.match(source, /\/dashboard\/finanzas\/documentos/);
});

test('finance procurement tables are tenant isolated through RLS migration', async () => {
  const source = await readFile(migration, 'utf8');
  for (const table of ['procurement_accounts_payable','procurement_supplier_payments','procurement_supplier_credit_notes']) {
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(source, /current_application_user_id/);
  assert.match(source, /to authenticated/);
});
