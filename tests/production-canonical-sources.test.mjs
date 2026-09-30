import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const api = new URL('../app/api/produccion/sources/route.ts', import.meta.url);
const page = new URL('../app/dashboard/produccion/fuentes/page.tsx', import.meta.url);
const layout = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);

test('production source registry is organization scoped and canonical', async () => {
  const source = await readFile(api, 'utf8');
  assert.match(source, /production_source_documents/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(source, /canonical_role/);
  assert.match(source, /source_file_sha256/);
});

test('production source UI preserves canonical supporting and plan-only semantics', async () => {
  const source = await readFile(page, 'utf8');
  assert.match(source, /Canónica/);
  assert.match(source, /Soporte/);
  assert.match(source, /Sólo plan/);
  assert.match(source, /un plan nunca se presenta como dato real/i);
  assert.match(source, /SHA-256/);
});

test('production navigation exposes sources and operational traceability', async () => {
  const source = await readFile(layout, 'utf8');
  assert.match(source, /\/dashboard\/produccion\/fuentes/);
  assert.match(source, /\/dashboard\/produccion\/trazabilidad/);
});
