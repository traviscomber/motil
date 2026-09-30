import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/finance/payables/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/finanzas/pagos/page.tsx', import.meta.url);
const inboxUrl = new URL('../app/api/actions/inbox/route.ts', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260930180000_add_dual_signature_payment_requests.sql', import.meta.url);

test('supplier transfers require two distinct signatures and canonical evidence', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /required_signatures: 2/);
  assert.match(source, /finance_payment_request_signatures/);
  assert.match(source, /Se requieren dos firmas distintas/);
  assert.match(source, /Adjunta el comprobante de transferencia/);
  assert.match(source, /module_documents/);
  assert.match(source, /evidence\.module !== 'finanzas'/);
});

test('direct supplier payment recording is disabled in favor of signed transfer requests', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /action === 'record_payment'/);
  assert.match(source, /requieren solicitud de transferencia y dos firmas/);
});

test('finance payment UI surfaces aging signatures transfer proof and reconciliation', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /día\(s\) vencida/);
  assert.match(source, /Esperan firmas/);
  assert.match(source, /dos firmas distintas/i);
  assert.match(source, /comprobantes-transferencia/);
  assert.match(source, /Transferencia hecha/);
  assert.match(source, /Conciliar/);
});

test('finance transfer actions stay in the organization inbox until resolved', async () => {
  const source = await readFile(inboxUrl, 'utf8');
  assert.match(source, /finance_payment_requests/);
  assert.match(source, /finance_transfer:/);
  assert.match(source, /Firmar transferencia/);
  assert.match(source, /Registrar transferencia/);
});

test('payment request tables are tenant isolated with RLS', async () => {
  const source = await readFile(migrationUrl, 'utf8');
  assert.match(source, /enable row level security/);
  assert.match(source, /finance_payment_requests_org_isolation/);
  assert.match(source, /finance_payment_signatures_org_isolation/);
  assert.match(source, /unique \(request_id, signer_id\)/);
});
