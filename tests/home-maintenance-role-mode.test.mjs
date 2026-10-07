import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile(new URL('../components/dashboard/dashboard-home.tsx', import.meta.url), 'utf8');
const viewerMode = await readFile(new URL('../lib/maintenance/viewer-mode.ts', import.meta.url), 'utf8');

test('role-aware Inicio reuses canonical maintenance role resolution', () => {
  assert.match(home, /resolveMaintenanceViewerMode/);
  assert.match(home, /maintenanceMode === 'planning'/);
  assert.match(home, /maintenanceMode === 'leadership'/);
  assert.match(home, /maintenanceMode === 'execution'/);
});

test('canonical maintenance roles include Ariel and Mauricio responsibilities', () => {
  assert.match(viewerMode, /cargo === 'jefe de planificación'/);
  assert.match(viewerMode, /cargo === 'jefe de equipos móviles y estacionarios'/);
  assert.match(viewerMode, /cargo === 'jefe departamento de mantenimiento'/);
});
