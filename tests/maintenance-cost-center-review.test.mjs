import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/cost-center-review/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../components/maintenance/cost-center-review.tsx', import.meta.url), 'utf8');
const dictionaries = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('cost center review stays tenant scoped and maintenance-authorized', () => {
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /is\('cost_center_id', null\)/);
});

test('cost center review uses evidence hints without auto assignment', () => {
  assert.match(route, /inferMachineFamilyFromText/);
  assert.match(route, /requiere confirmación humana/);
  assert.doesNotMatch(route, /\.update\(/);
});

test('progressive review assigns one OT then advances', () => {
  assert.match(page, /cost_center_id/);
  assert.match(dictionaries, /Una sola decisión principal por vez/);
  assert.match(dictionaries, /saveNext: 'Guardar y mostrar siguiente'/);
});
