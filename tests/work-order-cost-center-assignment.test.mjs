import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const dictionaries = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('general work-order edits remain maintenance-edit gated while assigned execution is narrow', () => {
  assert.match(route, /const hasModuleWrite = accessLevel === 'ED'/);
  assert.match(route, /if \(!hasModuleWrite\)/);
  assert.match(route, /El ejecutor asignado sólo puede iniciar su OT/);
});

test('cost center assignment is tenant scoped and validates active center', () => {
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /Centro de costo no válido para esta organización/);
  assert.match(route, /centro de costo seleccionado no está activo/i);
});

test('work order detail exposes finance assignment state', () => {
  assert.match(page, /cost_center_id/);
  assert.match(dictionaries, /title: 'Imputación financiera'/);
  assert.match(dictionaries, /pending: 'Pendiente: Compras no podrá adjudicar una OC asociada a esta OT\.'/);
});
