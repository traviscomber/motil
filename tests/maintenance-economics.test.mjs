import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/maintenance/economics/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/economia/page.tsx', 'utf8');

test('maintenance economics is tenant scoped and evidence based', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_GERENCIAL\)/);
  assert.match(api, /maintenance_cost_intelligence_summary_v1/);
  assert.match(api, /maintenance_reliability_summary_v1/);
  assert.match(api, /maintenance_runtime_cost_intelligence_v1/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /Datos faltantes permanecen desconocidos/);
});

test('maintenance economics UI does not fabricate unavailable rates', () => {
  assert.match(page, /Todavía no hay costo\/hora defendible/);
  assert.match(page, /no hay base económica auditada/i);
  assert.match(page, /No se pudo cargar Maintenance Economics/);
  assert.match(page, /\/api\/maintenance\/economics/);
});
