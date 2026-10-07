import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const home = await readFile(new URL('../components/dashboard/dashboard-home.tsx', import.meta.url), 'utf8');
const maintenanceHome = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');
const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('Spanish home does not expose raw drilling maintenance backend labels', () => {
  assert.match(home, /displayTaskTitle/);
  assert.match(home, /displayTaskEvidence/);
  assert.match(home, /Mantenimiento: equipo fuera de servicio/);
  assert.match(home, /Sondaje · revisión del equipo/);
  assert.match(home, /Equipo asociado/);
});

test('maintenance create and close breadcrumbs have localized route names', () => {
  assert.match(dict, /create: 'Crear OT'/);
  assert.match(dict, /cierre: 'Cierre'/);
  assert.match(dict, /create: 'Create WO'/);
  assert.match(dict, /cierre: 'Close'/);
});

test('maintenance intervention count is natural in the singular', () => {
  assert.match(maintenanceHome, /summary\.unplannedOverdueInterventionGroups === 1/);
  assert.match(maintenanceHome, /'1 intervención'/);
});

test('Spanish home avoids internal English dashboard copy', () => {
  assert.match(dict, /MOTIL · Sistema Operativo para Minería/);
  assert.match(dict, /Existencias y trazabilidad/);
  assert.match(dict, /Estado de la operación/);
  assert.match(dict, /OT y equipos/);
});
