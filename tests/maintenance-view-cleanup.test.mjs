import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobilePage = await readFile(new URL('../app/dashboard/mantenimiento/movil/page.tsx', import.meta.url), 'utf8');
const mobileRoute = await readFile(new URL('../components/maintenance/maintenance-mobile-route.tsx', import.meta.url), 'utf8');
const mobileLegacy = await readFile(new URL('../components/maintenance/maintenance-mobile-panel.tsx', import.meta.url), 'utf8');
const personnel = await readFile(new URL('../components/maintenance/technician-performance-board.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');
const workOrders = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
const workOrderDetail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const workOrderDetailRoute = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const equipmentPage = await readFile(new URL('../app/dashboard/mantenimiento/equipos/page.tsx', import.meta.url), 'utf8');

test('maintenance mobile route is gated to phone execution roles', () => {
  assert.match(mobilePage, /MaintenanceMobileRoute/);
  assert.doesNotMatch(mobilePage, /MaintenanceMobilePanel/);
  assert.match(mobilePage, /Vista mínima de trabajo asignado para mecánicos en terreno/);
  assert.match(mobileRoute, /data\?\.mode !== 'execution'/);
  assert.match(mobileRoute, /Vista móvil no asignada a este cargo/);
  assert.match(mobileRoute, /<MobileTerrainPanel \/>/);
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


test('work-order queue keeps planning and closure in their dedicated routes', () => {
  assert.doesNotMatch(workOrders, /MaintenanceSchedule/);
  assert.doesNotMatch(workOrders, /progressiveClose/);
  assert.doesNotMatch(workOrders, /getStatusClass/);
  assert.match(workOrders, /getStatusVariant/);
  assert.match(workOrders, /xl:grid-cols-\[minmax\(240px,1fr\)_170px_170px_auto\]/);
});


test('workshop work-order detail stays minimal and assigned-only', () => {
  assert.match(workOrderDetail, /const isWorkshop = viewer\?\.mode === 'workshop'/);
  assert.match(workOrderDetail, /Esta vista muestra sólo la orden asignada/);
  assert.match(workOrderDetailRoute, /mapRestrictedWorkOrder/);
  assert.match(workOrderDetailRoute, /Esta orden no está asignada a tu identidad operativa/);
  assert.match(workOrderDetailRoute, /surface\.mode === 'workshop'/);
  assert.match(workOrderDetailRoute, /modo de solo lectura/);
});


test('OT creation action follows canonical creator permission and restricted roles never see the global queue', () => {
  assert.match(workOrders, /viewer\?\.canCreateWorkOrder/);
  assert.match(workOrders, /viewer\?\.mode === 'execution'/);
  assert.match(workOrders, /viewer\?\.mode === 'workshop'/);
  assert.match(workOrders, /<MobileTerrainPanel \/>/);
  assert.match(workOrders, /<WorkshopAssignedWorkPanel \/>/);
  assert.doesNotMatch(workOrders, /scopeFilter === 'all'/);
});


test('personnel view keeps workload and removes ranking noise', () => {
  assert.match(personnel, /Personal de mantenimiento/);
  assert.match(personnel, /OT activas/);
  assert.match(personnel, /Completadas/);
  assert.doesNotMatch(personnel, /scoreLabel/);
  assert.doesNotMatch(personnel, /scoreColor/);
  assert.doesNotMatch(personnel, /<Progress/);
  assert.doesNotMatch(personnel, /<Award/);
});

test('Equipos is the single entry to Ficha 360 without parallel asset-view menu', () => {
  assert.match(equipmentPage, /El detalle operativo, técnico y económico vive en su Ficha 360/);
  assert.match(equipmentPage, /Importar equipos/);
  assert.doesNotMatch(equipmentPage, /Vistas del activo/);
  assert.doesNotMatch(equipmentPage, /const assetViews/);
});
