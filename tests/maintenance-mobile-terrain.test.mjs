import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');
const terrain = await readFile(new URL('../components/maintenance/mobile-terrain-panel.tsx', import.meta.url), 'utf8');
const myWork = await readFile(new URL('../app/api/maintenance/my-work/route.ts', import.meta.url), 'utf8');

test('execution users receive the dedicated assigned-work surface on every viewport', () => {
  assert.match(dashboard, /if \(mode === 'execution'\) \{/);
  assert.match(dashboard, /<MobileTerrainPanel locale=\{locale\} \/>/);
  assert.match(dashboard, /max-w-xl/);
  assert.doesNotMatch(dashboard, /md:hidden"><MobileTerrainPanel/);
  assert.doesNotMatch(dashboard, /mode==='execution' \? 'hidden md:block' : undefined/);
});

test('terrain surface exposes the full assigned active queue without global maintenance queues', () => {
  assert.match(terrain, /\/api\/maintenance\/my-work/);
  assert.doesNotMatch(terrain, /\/api\/maintenance\/control-center/);
  assert.match(terrain, /actions\.map/);
  assert.match(terrain, /Mis OT/);
  assert.match(terrain, /actionState\(action, locale\)/);
  assert.match(terrain, /priorityLabel\(action\.priority, locale\)/);
  assert.match(terrain, /Prioridad/);
  assert.match(terrain, /Media/);
  assert.match(terrain, /action\.assetName/);
  assert.doesNotMatch(terrain, /Primera prioridad/);
  assert.doesNotMatch(terrain, /Puedes tener varias OTs asignadas/);
  assert.match(terrain, /Perfil aún no vinculado/);
  assert.match(terrain, /No tienes trabajo asignado/);
  assert.doesNotMatch(terrain, /Ver todas las órdenes/);
  assert.doesNotMatch(terrain, /mobile-quick-complete/);
  assert.doesNotMatch(terrain, /MARCAR COMPLETADO/);
});

test('authorized field supervisors receive a visible create work order action', () => {
  assert.match(terrain, /canCreateWorkOrder/);
  assert.match(terrain, /Nueva OT/);
  assert.match(terrain, /\/dashboard\/mantenimiento\/ordenes-trabajo\/create/);
  assert.match(myWork, /getMaintenanceWorkOrderCreationCapability/);
  assert.match(myWork, /canCreateWorkOrder: creationCapability\.canCreate/);
});

test('my-work API requires canonical person linkage and scopes work orders to that assignee and organization', () => {
  assert.match(myWork, /resolveMaintenanceViewerMode\(cargoName\) !== 'execution'/);
  assert.match(myWork, /\.from\('people'\)/);
  assert.match(myWork, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(myWork, /\.eq\('profile_id', access\.user\.id\)/);
  assert.match(myWork, /identityLinked: false/);
  assert.match(myWork, /\.from\('maintenance_work_orders'\)/);
  assert.match(myWork, /\.eq\('assigned_person_id', person\.id\)/);
  assert.match(myWork, /terminalStatuses/);
  assert.match(myWork, /maintenance_canonical_assets_v1/);
  assert.match(myWork, /assetNameById/);
});
