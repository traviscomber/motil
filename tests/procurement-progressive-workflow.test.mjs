import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('components/procurement/progressive-procurement-workflow.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/compras/flujo/page.tsx', 'utf8');

test('procurement workflow exposes one explicit next action', () => {
  assert.match(ui, /Siguiente acción/);
  assert.match(ui, /nextActionControl/);
  assert.match(ui, /Revisar adjudicación/);
  assert.match(ui, /Revisar decisión/);
  assert.match(ui, /Registrar recepción/);
  assert.match(ui, /Solicitar cotización/);
  assert.match(ui, /Continuar a factura/);
});

test('procurement progression continues into invoice and payment controls', () => {
  assert.match(ui, /Comprar/);
  assert.match(ui, /\/dashboard\/compras\/facturas/);
  assert.match(ui, /\/dashboard\/finanzas\/pagos/);
  assert.match(ui, /SecondaryDetails/);
});

test('progressive workflow uses the operational API except for canonical award decision', () => {
  assert.match(ui, /action: 'create_request'/);
  assert.match(ui, /action: 'create_quotation'/);
  assert.match(ui, /action: 'receive_purchase_order'/);
  assert.doesNotMatch(ui, /action: 'award_quotation'/);
  assert.match(ui, /openAwardDecision/);
  assert.match(ui, /document\.getElementById\('procurement-award-decision'\)/);
  assert.match(page, /AwardEvidencePanel/);
  assert.match(page, /ProgressiveProcurementWorkflow/);
});
