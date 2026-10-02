import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');
const terrain = await readFile(new URL('../components/maintenance/mobile-terrain-panel.tsx', import.meta.url), 'utf8');
const myWork = await readFile(new URL('../app/api/maintenance/my-work/route.ts', import.meta.url), 'utf8');

test('execution users receive the dedicated assigned-work surface on every viewport', () => {
  assert.match(dashboard, /if \(mode === 'execution'\) \{/);
  assert.match(dashboard, /<MobileTerrainPanel \/>/);
  assert.match(dashboard, /mobileExecution \? 'mx-auto w-full max-w-md' : 'mx-auto w-full max-w-2xl'/);
  assert.doesNotMatch(dashboard, /md:hidden"><MobileTerrainPanel/);
  assert.doesNotMatch(dashboard, /mode==='execution' \? 'hidden md:block' : undefined/);
});

test('terrain surface exposes one assigned next action without global maintenance queues', () => {
  assert.match(terrain, /\/api\/maintenance\/my-work/);
  assert.doesNotMatch(terrain, /\/api\/maintenance\/control-center/);
  assert.match(terrain, /Siguiente trabajo/);
  assert.match(terrain, /Abrir trabajo/);
  assert.match(terrain, /Perfil aún no vinculado/);
  assert.match(terrain, /No tienes trabajo asignado/);
  assert.doesNotMatch(terrain, /Ver todas las órdenes/);
  assert.match(terrain, /Sólo ves trabajo asignado a tu identidad operativa/);
  assert.doesNotMatch(terrain, /mobile-quick-complete/);
  assert.doesNotMatch(terrain, /MARCAR COMPLETADO/);
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
});


test('legacy mobile route uses the same minimal assigned-work surface', async () => {
  const mobileRoute = await readFile(new URL('../app/dashboard/mantenimiento/movil/page.tsx', import.meta.url), 'utf8');
  assert.match(mobileRoute, /MobileTerrainPanel/);
  assert.doesNotMatch(mobileRoute, /MaintenanceMobilePanel/);
  assert.doesNotMatch(mobileRoute, /Dashboard gerencial/);
});
