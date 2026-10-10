import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('components/procurement/progressive-invoice-workflow.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/compras/facturas/page.tsx', 'utf8');

test('invoice workspace exposes one explicit next action', () => {
  assert.match(ui, /Siguiente acción/);
  assert.match(ui, /nextActionControl/);
  assert.match(ui, /Resolver excepción/);
  assert.match(ui, /Completar recepción/);
  assert.match(ui, /Aprobar pago/);
  assert.match(ui, /Registrar factura/);
  assert.match(ui, /Continuar a Tesorería/);
});

test('invoice progression follows real controls and routes', () => {
  assert.match(ui, /create_supplier_invoice/);
  assert.match(ui, /resolve_supplier_invoice_exception/);
  assert.match(ui, /approve_supplier_invoice_payment/);
  assert.match(ui, /\/dashboard\/compras\/flujo/);
  assert.match(ui, /\/dashboard\/finanzas\/pagos/);
  assert.match(ui, /recepción aceptada/);
});

test('facturas route delegates to progressive workflow', () => {
  assert.match(page, /ProgressiveInvoiceWorkflow/);
});
