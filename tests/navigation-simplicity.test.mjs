import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sidebarPath = new URL('../components/layout/sidebar.tsx', import.meta.url);
const dictPath = new URL('../lib/i18n/dictionaries.ts', import.meta.url);

test('global navigation uses role-aware Inicio instead of parallel personal portals', async () => {
  const sidebar = await readFile(sidebarPath, 'utf8');

  assert.match(sidebar, /href\s*:\s*'\/dashboard'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-operacion'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-finanzas'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-area'/);
});

test('role-aware Inicio keeps operational personalization', async () => {
  const dict = await readFile(dictPath, 'utf8');

  assert.match(dict, /title: 'Mi Mantenimiento'/);
  assert.match(dict, /title: 'Mi Planta'/);
  assert.match(dict, /title: 'Mi Bodega'/);
  assert.match(dict, /title: 'Mi Administración'/);
  assert.match(dict, /title: 'Resumen ejecutivo'/);
});
