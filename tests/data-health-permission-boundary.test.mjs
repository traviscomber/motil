import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const accessUrl = new URL('../lib/intelligence/data-health-access.ts', import.meta.url);
const healthUrl = new URL('../app/api/data-quality/health/route.ts', import.meta.url);
const reconciliationUrl = new URL('../app/api/data-quality/reconciliation/route.ts', import.meta.url);
const assistantUrl = new URL('../app/api/data-quality/assistant/route.ts', import.meta.url);
const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);

test('data health scope is derived from existing operational permissions', async () => {
  const source = await readFile(accessUrl, 'utf8');
  assert.match(source, /MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(source, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(source, /MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(source, /MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(source, /MODULE_KEYS\.HSE_TABLERO/);
  assert.match(source, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(source, /MODULE_KEYS\.FIN_FINANZAS/);
  assert.match(source, /requireModuleAccess/);
  assert.match(source, /canRead/);
  assert.doesNotMatch(source, /data_health.*module|calidad.*module/i);
});

test('health endpoint queries only authorized domains', async () => {
  const source = await readFile(healthUrl, 'utf8');
  assert.match(source, /resolveDataHealthAccess/);
  assert.match(source, /productionAllowed \?/);
  assert.match(source, /maintenanceAllowed \?/);
  assert.match(source, /inventoryAllowed \?/);
  assert.match(source, /procurementAllowed \?/);
  assert.match(source, /hseAllowed \?/);
  assert.match(source, /legalAllowed \?/);
  assert.match(source, /financeAllowed \?/);
  assert.match(source, /Sólo se consultan y exponen dominios que el usuario puede leer según role_matrix/);
});

test('cross-domain reconciliation remains admin-only until governance permission exists', async () => {
  const source = await readFile(reconciliationUrl, 'utf8');
  assert.match(source, /resolveDataHealthAccess/);
  assert.match(source, /if \(!access\.admin\)/);
  assert.match(source, /RRHH\/Data Governance explícito/);
  assert.match(source, /people.*rut.*email/s);
});

test('data health assistant is read-only and permission-aware', async () => {
  const [assistant, widget] = await Promise.all([
    readFile(assistantUrl, 'utf8'),
    readFile(widgetUrl, 'utf8'),
  ]);
  assert.match(assistant, /resolveDataHealthAccess/);
  assert.match(assistant, /routeOperationalQuery\(message, \{ domain: 'data_health' \}\)/);
  assert.match(assistant, /access\.canRead\('production'\)/);
  assert.match(assistant, /access\.canRead\('maintenance'\)/);
  assert.match(assistant, /access\.canRead\('inventory'\)/);
  assert.match(assistant, /access\.canRead\('procurement'\)/);
  assert.match(assistant, /READ_ONLY/);
  assert.match(assistant, /no corrige, concilia ni modifica fuentes|no corrige.*modifica/i);
  assert.match(widget, /\/api\/data-quality\/assistant/);
  assert.match(widget, /dataHealthToolCopy/);
});
