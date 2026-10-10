import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/dashboard/compras/facturas/page.tsx', 'utf8');
const ui = fs.readFileSync('components/procurement/progressive-invoice-workflow.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/compras/layout.tsx', 'utf8');

test('compras exposes a dedicated supplier invoice workspace', () => {
  assert.match(layout, /\/dashboard\/compras\/facturas/);
  assert.match(layout, /label: 'Facturas'/);
  assert.match(page, /ProgressiveInvoiceWorkflow/);
  assert.match(ui, /Facturas/);
});

test('invoice workspace uses operational API and renders honest empty states', () => {
  assert.match(ui, /\/api\/procurement\/operational-pipeline/);
  assert.match(ui, /No hay facturas registradas para contrastar/);
  assert.match(ui, /Sin acción pendiente/);
});

test('invoice workspace creates supplier invoices and surfaces three-way evidence', () => {
  assert.match(ui, /create_supplier_invoice/);
  assert.match(ui, /refresh_supplier_invoice_match/);
  assert.match(ui, /invoiceMatchSummary/);
  assert.match(ui, /invoiceMatchLines/);
  assert.match(ui, /quantity_accepted/);
  assert.match(ui, /line_match_status/);
});

test('invoice workspace states that receipt owns operational cost recognition', () => {
  assert.match(ui, /el pago no vuelve a reconocer costo operacional/i);
  assert.match(ui, /recepción aceptada/i);
});
