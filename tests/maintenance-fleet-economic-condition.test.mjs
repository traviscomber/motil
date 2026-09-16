import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/maintenance/economics/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/economia/page.tsx', 'utf8');

test('fleet economics keeps historical, observed and audited evidence tenant scoped', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_GERENCIAL\)/);
  assert.match(api, /maintenance_asset_economic_history_v1/);
  assert.match(api, /production_drilling_source_reports/);
  assert.match(api, /maintenance_cost_intelligence_summary_v1/);
  assert.match(api, /maintenance_reliability_summary_v1/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /historical_economics_ready/);
  assert.match(api, /observed_condition_ready/);
});

test('fleet condition evidence is paged and partial coverage is never presented as complete', () => {
  assert.match(api, /REPORT_PAGE_SIZE = 1000/);
  assert.match(api, /MAX_REPORT_ROWS = 20000/);
  assert.match(api, /loadDrillingReports/);
  assert.match(api, /\.range\(offset, offset \+ REPORT_PAGE_SIZE - 1\)/);
  assert.match(api, /observed_condition_truncated/);
  assert.match(api, /MOTIL no presenta esa cobertura como completa/);
  assert.match(api, /truncated: drillingResult\.truncated/);
});

test('fleet economics preserves canonical asset identity and does not infer causality', () => {
  assert.match(api, /canonical_asset_id/);
  assert.match(api, /Historia financiera reconocida y vinculada por canonical_asset_id/);
  assert.match(api, /no prueban una falla mecánica ni su causa/);
  assert.match(api, /no implica causalidad ni habilita costo por metro/);
  assert.match(api, /probabilidad de falla ni diagnóstico/);
  assert.match(api, /equipment_without_crew_raw/);
  assert.match(api, /power_outage_raw/);
  assert.match(api, /water_shortage_raw/);
});

test('maintenance economics presents history and observed condition without merging them into audited cost', () => {
  assert.match(page, /Costo histórico reconocido/);
  assert.match(page, /Condición operacional observada/);
  assert.match(page, /Costo OT auditado/);
  assert.match(page, /Historia económica canónica/);
  assert.match(page, /Equipos con mayor historia económica/);
  assert.match(page, /no equivalen a causa mecánica/);
  assert.match(page, /No es probabilidad de falla ni diagnóstico mecánico/);
  assert.match(page, /\/dashboard\/mantenimiento\/equipos\/\$\{row\.canonical_asset_id\}\/ficha/);
});
