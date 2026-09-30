import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/bodega/sources/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/bodega/fuentes/page.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/bodega/layout.tsx', import.meta.url);

test('Bodega source registry is organization scoped and reads canonical product provenance', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(source, /canonical_products_v1/);
  assert.match(source, /canonical_inventory_current/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
});

test('Bodega distinguishes canonical files operational baselines and tests', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /canonical_file/);
  assert.match(source, /operational_baseline/);
  assert.match(source, /test/);
  assert.match(source, /\.endsWith\('\.xlsx'\)/);
  assert.match(source, /includes\('uat'\)/);
});

test('Bodega source view keeps provenance visible without counting tests as canonical', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /Fuente canónica/);
  assert.match(source, /Baseline operacional/);
  assert.match(source, /Prueba excluida/);
  assert.match(source, /Aceptada como fuente del modelo canónico/);
});

test('Bodega exposes source provenance in module navigation', async () => {
  const source = await readFile(layoutUrl, 'utf8');
  assert.match(source, /\/dashboard\/bodega\/fuentes/);
  assert.match(source, /label: 'Fuentes'/);
});
