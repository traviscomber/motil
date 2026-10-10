import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overviewApi = new URL('../app/api/procurement/overview/route.ts', import.meta.url);
const comprasPage = new URL('../app/dashboard/compras/page.tsx', import.meta.url);
const comprasLayout = new URL('../app/dashboard/compras/layout.tsx', import.meta.url);

test('procurement overview reads canonical purchase orders and suppliers by organization', async () => {
  const source = await readFile(overviewApi, 'utf8');
  assert.match(source, /canonical_purchase_orders_current/);
  assert.match(source, /canonical_suppliers_v1/);
  assert.match(source, /organization_id/);
  assert.match(source, /MODULE_KEYS\.FIN_COMPRAS/);
});

test('procurement overview keeps operational flow distinct from canonical history', async () => {
  const source = await readFile(overviewApi, 'utf8');
  assert.match(source, /procurement_intake_requests/);
  assert.match(source, /procurement_operational_orders/);
  assert.match(source, /procurement_operational_receipts/);
  assert.match(source, /procurement_supplier_invoices/);
  assert.match(source, /module_documents/);
});

test('Compras home surfaces canonical history operational execution and documents', async () => {
  const source = await readFile(comprasPage, 'utf8');
  assert.match(source, /Órdenes de compra/);
  assert.match(source, /Proveedores/);
  assert.match(source, /Recepciones/);
  assert.match(source, /<OperationalPipelineBoard compact/);
  assert.match(source, /isLoading \|\| value === undefined \? '—'/);
  assert.ok(source.indexOf('<OperationalPipelineBoard compact') < source.indexOf('<SecondaryDetails>'));
});

test('Compras navigation exposes the canonical document center', async () => {
  const source = await readFile(comprasLayout, 'utf8');
  assert.match(source, /\/dashboard\/compras\/documentos/);
});
