import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sidebarPath = new URL('../components/layout/sidebar.tsx', import.meta.url);
const dashboardPath = new URL('../app/dashboard/page.tsx', import.meta.url);

test('global navigation uses role-aware Inicio instead of parallel personal portals', async () => {
  const sidebar = await readFile(sidebarPath, 'utf8');

  assert.match(sidebar, /href\s*:\s*'\/dashboard'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-operacion'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-finanzas'/);
  assert.doesNotMatch(sidebar, /href\s*:\s*'\/dashboard\/mi-area'/);
});

test('role-aware Inicio keeps operational personalization', async () => {
  const dashboard = await readFile(dashboardPath, 'utf8');

  assert.match(dashboard, /title: 'Mi Mantención'/);
  assert.match(dashboard, /title: 'Mi Planta'/);
  assert.match(dashboard, /title: 'Mi Bodega'/);
  assert.match(dashboard, /title: 'Mi Administración'/);
  assert.match(dashboard, /title: 'Resumen ejecutivo'/);
});
