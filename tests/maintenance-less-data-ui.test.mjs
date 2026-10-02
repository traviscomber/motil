import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const layout = await readFile(new URL('../app/dashboard/mantenimiento/layout.tsx', import.meta.url), 'utf8');
const mobile = await readFile(new URL('../app/dashboard/mantenimiento/movil/page.tsx', import.meta.url), 'utf8');
const personnelPage = await readFile(new URL('../app/dashboard/mantenimiento/personal/page.tsx', import.meta.url), 'utf8');
const personnelBoard = await readFile(new URL('../components/maintenance/technician-performance-board.tsx', import.meta.url), 'utf8');

test('maintenance shell keeps only primary role navigation visible', () => {
  assert.match(layout, /leadership:[\s\S]*support:\s*\['Resumen', 'Activos', 'Indicadores'\]/);
  assert.match(layout, /planning:[\s\S]*support:\s*\['Resumen', 'Activos'\]/);
  assert.match(layout, /execution:[\s\S]*flow:\s*\[\][\s\S]*support:\s*\['Resumen'\]/);
  assert.match(layout, /general:[\s\S]*support:\s*\['Resumen', 'Activos'\]/);
  assert.doesNotMatch(layout, /support:\s*\[[^\]]*'Imputación'[^\]]*'Maestranza'[^\]]*'Personal'[^\]]*'Fuentes'/);
});

test('mobile maintenance route contains only assigned work', () => {
  assert.match(mobile, /MobileTerrainPanel/);
  assert.doesNotMatch(mobile, /MaintenanceMobilePanel/);
  assert.doesNotMatch(mobile, /gerencial/i);
});

test('personnel view limits visible summary density', () => {
  assert.doesNotMatch(personnelPage, /PageHeaderActions/);
  assert.doesNotMatch(personnelPage, /Trazabilidad operacional/);
  assert.match(personnelBoard, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.doesNotMatch(personnelBoard, /\['Personal identificable', summary\.activeWorkers\]/);
});
