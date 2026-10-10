import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navUrl = new URL('../components/layout/documentation-context-nav.tsx', import.meta.url);
const shellUrl = new URL('../components/layout/dashboard-shell.tsx', import.meta.url);
const libraryUrl = new URL('../app/dashboard/documentos/page.tsx', import.meta.url);
const controlUrl = new URL('../app/dashboard/documentos-gestion/page.tsx', import.meta.url);
const controlApiUrl = new URL('../app/api/dashboard/documentos-gestion/route.ts', import.meta.url);

test('Documentación exposes library and control as parallel contexts', async () => {
  const source = await readFile(navUrl, 'utf8');
  const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');
  assert.match(source, /href: '\/dashboard\/documentos'/);
  assert.match(source, /href: '\/dashboard\/documentos-gestion'/);
  assert.match(dict, /library: 'Biblioteca'/);
  assert.match(dict, /control: 'Control documental'/);
  assert.doesNotMatch(source, /step:/);
});

test('shared documentation context is mounted once in the dashboard shell', async () => {
  const source = await readFile(shellUrl, 'utf8');
  assert.match(source, /<DocumentationContextNav dictionary=\{dictionary\} \/>/);
});

test('library and control retain distinct responsibilities', async () => {
  const library = await readFile(libraryUrl, 'utf8');
  const control = await readFile(controlUrl, 'utf8');

  assert.match(library, /Subir documento/i);
  assert.match(library, /\/api\/documents/);
  assert.match(control, /Pendientes de aprobación/);
  assert.match(control, /Vencimientos próximos/);
  assert.match(control, /Categorías/);
  assert.match(control, /\/api\/dashboard\/documentos-gestion/);
});

test('document control source failures never become a successful zero dashboard', async () => {
  const route = await readFile(controlApiUrl, 'utf8');
  assert.match(route, /\{ status: 500 \}/);
  assert.match(route, /No fue posible cargar gestión documental/);
  assert.doesNotMatch(route, /createEmptyDashboardPayload/);
});
