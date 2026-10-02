import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobilePage = await readFile(new URL('../app/dashboard/mantenimiento/movil/page.tsx', import.meta.url), 'utf8');
const mobileLegacy = await readFile(new URL('../components/maintenance/maintenance-mobile-panel.tsx', import.meta.url), 'utf8');
const personnel = await readFile(new URL('../components/maintenance/technician-performance-board.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');

test('maintenance mobile route uses assigned work instead of the legacy global mobile dashboard', () => {
  assert.match(mobilePage, /MobileTerrainPanel/);
  assert.doesNotMatch(mobilePage, /MaintenanceMobilePanel/);
  assert.match(mobilePage, /Vista mínima de trabajo asignado para mecánicos en terreno/);
});

test('legacy maintenance mobile dashboard is no longer routed', () => {
  assert.match(mobileLegacy, /\/api\/maintenance\/assets/);
  assert.match(mobileLegacy, /\/api\/maintenance\/work-orders/);
  assert.match(mobileLegacy, /\/api\/maintenance\/personal/);
  assert.doesNotMatch(mobilePage, /maintenance-mobile-panel/);
});

test('personnel summary stays within the MOTIL two-to-four metric rule', () => {
  assert.match(personnel, /sm:grid-cols-3/);
  assert.match(personnel, /\['Mecánicos', summary\.mechanics\]/);
  assert.match(personnel, /\['Operarios', summary\.operators\]/);
  assert.match(personnel, /\['OT con cargo válido', summary\.totalWorkOrders\]/);
  assert.doesNotMatch(personnel, /\['Personal identificable', summary\.activeWorkers\]/);
  assert.doesNotMatch(personnel, /\['Completación OT'/);
});


test('maintenance home does not repeat static people and vehicle canonical overviews', () => {
  assert.doesNotMatch(home, /CanonicalMaintenanceOverview/);
  assert.doesNotMatch(home, /canonical-maintenance-overview/);
});
