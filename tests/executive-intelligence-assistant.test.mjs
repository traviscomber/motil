import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const accessUrl = new URL('../lib/intelligence/executive-access.ts', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);

const read = (url) => readFile(url, 'utf8');

test('executive assistant scopes each domain through module access', async () => {
  const access = await read(accessUrl);
  assert.match(access, /PROD_OPERACIONES/);
  assert.match(access, /MANT_GERENCIAL/);
  assert.match(access, /BODEGA_INVENTARIO/);
  assert.match(access, /FIN_COMPRAS/);
  assert.match(access, /FIN_FINANZAS/);
  assert.match(access, /requireModuleAccess/);
  assert.match(access, /effectiveDomains/);
});

test('executive assistant is operationally read only and does not bypass unauthorized domains', async () => {
  const route = await read(routeUrl);
  assert.match(route, /resolveExecutiveAccess/);
  assert.match(route, /routeOperationalQuery\(message, \{ domain: 'executive' \}\)/);
  assert.match(route, /route\.mode === 'action'/);
  assert.match(route, /READ_ONLY/);
  assert.match(route, /access\.canRead\('production'\)/);
  assert.match(route, /access\.canRead\('maintenance'\)/);
  assert.match(route, /access\.canRead\('inventory'\)/);
  assert.match(route, /access\.canRead\('procurement'\)/);
  assert.match(route, /access\.canRead\('finance'\)/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.delete\(/);
  assert.match(route, /\.from\('motil_ai_core_runs'\)[\s\S]*?\.update\(\{/);
  assert.doesNotMatch(route, /\.from\('(maintenance_work_orders|canonical_inventory_current|canonical_purchase_orders_current|canonical_finance_cost_centers)'\)[\s\S]{0,180}?\.update\(/);
});

test('executive synthesis preserves source freshness and is exposed through the shared launcher', async () => {
  const [route, widget] = await Promise.all([read(routeUrl), read(widgetUrl)]);
  assert.match(route, /Conserva por separado la fecha de corte de cada fuente/);
  assert.match(route, /No conviertas ausencia de permiso, ausencia de fuente ni vacío de datos en un cero operacional/);
  assert.match(route, /Prioriza máximo 3 asuntos/);
  assert.match(widget, /executive:/);
  assert.match(widget, /\/api\/intelligence\/executive-assistant/);
  assert.match(widget, /read_executive_production/);
  assert.match(widget, /read_executive_finance/);
});
