import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardUrl = new URL('../components/dashboard/produccion-dashboard.tsx', import.meta.url);
const routeUrl = new URL('../app/api/produccion/canonical-overview/route.ts', import.meta.url);

test('production summary puts current operation before source coverage', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  const currentIndex = dashboard.indexOf('aria-label="Operación actual"');
  const coverageIndex = dashboard.indexOf('<CoverageOverview data={data}/>');
  assert.ok(currentIndex >= 0, 'current operation section must exist');
  assert.ok(coverageIndex > currentIndex, 'source coverage must follow current operation');

  assert.match(dashboard, /Pendientes/);
  assert.ok(dashboard.indexOf('<SecondaryDetails>') > currentIndex);
  assert.ok(coverageIndex > dashboard.indexOf('<SecondaryDetails>'));
  assert.match(dashboard, /Estado de fuentes/);
  assert.match(dashboard, /Detalle secundario de cobertura/);
  assert.doesNotMatch(dashboard, /Cobertura real por área/);
  assert.doesNotMatch(dashboard, /Trabajo pendiente sobre datos/);
  assert.doesNotMatch(dashboard, /min-h-52/);
});

test('production source review remains compact and does not fabricate a combined backlog', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  assert.match(dashboard, /Revisiones de datos/);
  assert.match(dashboard, /Las colas pueden solaparse y no se suman como un único total/);
  assert.match(dashboard, /Calidad de datos/);
  assert.match(dashboard, /Sin fuente/);
  assert.match(dashboard, /sin fuente nunca se representa como cero/i);
});

test('canonical overview remains tenant scoped and read only for the summary composition', async () => {
  const route = await readFile(routeUrl, 'utf8');

  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_OPERACIONES\)/);
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /Ausencia de una fuente no equivale a valor cero/);
  assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)/);
});
