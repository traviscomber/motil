import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scope = await readFile(new URL('../lib/maintenance/workshop-site-scope.ts', import.meta.url), 'utf8');
const org = await readFile(new URL('../lib/api/organization-context.ts', import.meta.url), 'utf8');
const workOrders = await readFile(new URL('../app/api/maintenance/work-orders/route.ts', import.meta.url), 'utf8');
const detail = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const closeQueue = await readFile(new URL('../app/api/maintenance/work-order-close-queue/route.ts', import.meta.url), 'utf8');
const createView = await readFile(new URL('../components/maintenance/create-work-order.tsx', import.meta.url), 'utf8');
const workOrdersView = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
const viewerContext = await readFile(new URL('../app/api/maintenance/viewer-context/route.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261009163000_scope_workshop_heads_to_mine.sql', import.meta.url), 'utf8');

test('three workshop heads are mapped to exact canonical mines, without affecting mine general managers', () => {
  for (const cargo of ['jefe de taller mina don jaime', 'jefe de taller mina san pedro', 'jefe de taller mina peumo']) {
    assert.match(scope, new RegExp(cargo));
  }
  assert.match(scope, /workshopSiteFromCargo/);
  assert.doesNotMatch(scope, /cargo\.includes\('jefe de taller'/);
  assert.match(scope, /if \(!scope\.isWorkshopHead\) return true/);
});

test('workshop head authorization never inherits organization-wide OT edit permissions', () => {
  assert.match(org, /resolveWorkshopHeadScope\(workshopContext\)/);
  assert.match(org, /workshopHeadCanAccessOrder\(workshop, order\)/);
  assert.match(org, /OT fuera de tu faena/);
  assert.match(scope, /if \(!scope\.personId\) return false/);
  assert.match(scope, /if \(order\.workshop_site\) return order\.workshop_site === scope\.site/);
  assert.match(scope, /return order\.assigned_person_id === scope\.personId/);
  assert.match(org, /work-orders.*\(\[0-9a-f-\]\{36\}\)/);
});

test('all workshop leads see site OTs rather than all-company OTs or only personal assignments', () => {
  assert.match(workOrders, /query\.or\(workshopHeadOrderFilter\(workshopScope\)\)/);
  assert.match(scope, /workshop_site\.is\.null,assigned_person_id\.eq/);
  assert.match(closeQueue, /\.or\(workshopHeadOrderFilter\(workshopScope\)\)/);
  assert.match(closeQueue, /allowedWorkOrderIds = \(siteOrders \|\| \[\]\)\.map/);
  assert.match(closeQueue, /readinessQuery = readinessQuery\.in\('work_order_id', allowedWorkOrderIds\)/);
  assert.match(viewerContext, /workshopSite: workshopScope\.isWorkshopHead/);
  assert.match(workOrdersView, /data\\.workshopSite/);
  assert.match(workOrdersView, /locale === 'en'/);
});

test('creating and reassigning OTs cannot transfer work to another explicitly labeled mine', () => {
  assert.match(workOrders, /assetSite && assetSite !== workshopScope\.site/);
  assert.match(workOrders, /assigneeSite && assigneeSite !== workshopScope\.site/);
  assert.match(workOrders, /workshop_site: workshopScope\.site/);
  assert.match(workOrders, /linkedOrder\.workshop_site && linkedOrder\.workshop_site !== workshopScope\.site/);
  assert.match(workOrders, /existingRequestOrder\.workshop_site !== workshopScope\.site/);
  assert.match(detail, /assigneeSite && assigneeSite !== workshopScope\.site/);
  assert.match(createView, /Mina \$\{workshopSite\}/);
  assert.match(createView, /workshopSiteFromKnownLocation/);
});

test('legacy operational OT classification uses only known workshop head identities, never invented mine for unknown records', () => {
  assert.match(migration, /add column if not exists workshop_site text/);
  assert.match(migration, /wo\.assigned_person_id = pe\.id/);
  assert.match(migration, /wo\.created_by is not null/);
  assert.match(migration, /wo\.workshop_site is null/);
  assert.match(migration, /pe\.role_title in \(/);
  assert.doesNotMatch(migration, /update public\.warehouse_stock|insert into public\.stock_movements/i);
  assert.doesNotMatch(migration, /update public\.role_matrix/i);
});
