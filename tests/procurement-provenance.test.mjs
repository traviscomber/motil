import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/procurement/sources/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/compras/fuentes/page.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/compras/layout.tsx', import.meta.url);

test('procurement provenance is tenant scoped and reads canonical sources', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(source, /canonical_purchase_orders_v1/);
  assert.match(source, /canonical_suppliers_v1/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
});

test('procurement source registry distinguishes files from operational baselines', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /operational_baseline/);
  assert.match(source, /canonical_file/);
  assert.match(source, /system_generated/);
  assert.match(source, /normalized\.startsWith\('public\.'\)/);
});

test('procurement provenance UI preserves missing-file truth boundary', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /no conserva hoy el archivo Excel original de Compras/);
  assert.match(source, /MOTIL no los presenta como archivos entregados/);
  assert.match(source, /OC canónicas/);
  assert.match(source, /Proveedores canónicos/);
});

test('procurement navigation exposes source provenance', async () => {
  const source = await readFile(layoutUrl, 'utf8');
  assert.match(source, /\/dashboard\/compras\/fuentes/);
  assert.match(source, /Fuentes/);
});
