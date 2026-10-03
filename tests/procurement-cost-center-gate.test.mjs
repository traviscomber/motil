import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261003001000_require_cost_center_before_procurement_award.sql', import.meta.url),
  'utf8',
);
const route = await readFile(new URL('../app/api/procurement/workflow/route.ts', import.meta.url), 'utf8');
const ui = await readFile(
  new URL('../components/procurement/progressive-procurement-workflow.tsx', import.meta.url),
  'utf8',
);

test('procurement award is blocked in the canonical RPC without a valid active cost center', () => {
  assert.match(migration, /La solicitud debe tener un centro de costo antes de adjudicar y emitir la OC/);
  assert.match(migration, /canonical\.cost_centers/);
  assert.match(migration, /cc\.is_active = true/);
  assert.match(migration, /cc\.validation_status = 'valid'/);
});

test('procurement API fails before award when cost center evidence is missing or invalid', () => {
  assert.match(route, /canonical_supplier_quotations_v1/);
  assert.match(route, /canonical_procurement_requests_v1/);
  assert.match(route, /canonical_cost_centers_current/);
  assert.match(route, /La solicitud necesita un centro de costo antes de adjudicar y emitir la OC/);
  assert.match(route, /El centro de costo de la solicitud no es canónico, válido y activo/);
  assert.match(route, /status: 409/);
});

test('new procurement requests require a canonical cost-center selection', () => {
  assert.match(ui, /useCostCenters/);
  assert.match(ui, /const \[costCenterCode, setCostCenterCode\] = useState\(''\)/);
  assert.match(ui, /if \(!costCenterCode\) return setActionError\('Selecciona un centro de costo\.'\)/);
  assert.match(ui, /cost_center_code: costCenterCode/);
  assert.match(ui, /value=\{costCenterCode\}/);
  assert.match(ui, /costCenters\.map/);
  assert.match(ui, /!costCenterCode/);
});

test('request cards expose the financial imputation instead of hiding missing data', () => {
  assert.match(ui, /cost_center_code\?: string \| null/);
  assert.match(ui, /Centro de costo: \{request\.cost_center_code \|\| 'Pendiente de imputación'\}/);
});
