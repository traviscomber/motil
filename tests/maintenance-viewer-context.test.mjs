import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const route = await fs.readFile('app/api/maintenance/viewer-context/route.ts', 'utf8');
const viewerMode = await fs.readFile('lib/maintenance/viewer-mode.ts', 'utf8');

test('maintenance viewer context preserves canonical cargo instead of synthetic role copy', () => {
  assert.match(route, /const mode = resolveMaintenanceViewerMode\(cargoName\)/);
  assert.match(route, /\n\s+cargoName,\n\s+canEdit: access\.canWrite/);
  assert.doesNotMatch(route, /cargoName: mode === 'general' \? null : cargoName/);
});

test('maintenance role routing stays explicit for every canonical maintenance cargo family', () => {
  assert.match(viewerMode, /jefe departamento de mantenimiento/);
  assert.match(viewerMode, /jefe de planificación/);
  assert.match(viewerMode, /jefe de equipos móviles y estacionarios'\) return 'planning'/);
  assert.match(viewerMode, /gerente operaciones/);
  assert.match(viewerMode, /jefe sostenibilidad/);
  assert.match(viewerMode, /return 'oversight'/);
  assert.match(viewerMode, /cargo\.startsWith\('mecánico'\)/);
  assert.match(viewerMode, /cargo\.startsWith\('jefe de taller mina'\)/);
  assert.match(viewerMode, /encargado de camionetas y camiones/);
  assert.match(viewerMode, /cargo === 'soldador'/);
});


test('phone execution surface is explicit and limited to mechanic cargos', () => {
  assert.match(route, /const mobileExecution = String\(cargoName \|\| ''\).*startsWith\('mecánico'\)/s);
  assert.match(route, /mobileExecution,/);
});
