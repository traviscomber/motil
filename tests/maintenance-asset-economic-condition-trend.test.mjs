import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/maintenance/assets/[id]/economic-condition-trend/route.ts', 'utf8');
const panel = fs.readFileSync('components/maintenance/asset-economic-condition-trend.tsx', 'utf8');
const ficha = fs.readFileSync('app/dashboard/mantenimiento/equipos/[id]/ficha/page.tsx', 'utf8');

test('asset trend comparison stays tenant scoped and uses canonical evidence', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /canonical_clp_cost_ledger/);
  assert.match(api, /production_drilling_source_reports/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /eq\('canonical_asset_id', id\)/);
  assert.match(api, /MIN_REPORTS_PER_WINDOW = 30/);
  assert.match(api, /loadPaged/);
});

test('asset trend comparison preserves evidence boundaries', () => {
  assert.match(api, /frecuencia observada, no probabilidad de falla/);
  assert.match(api, /no demuestra causalidad ni predice una falla futura/);
  assert.match(api, /Agua, energía o falta de dotación permanecen separadas/);
  assert.match(api, /diagnóstico e intervención requieren validación humana/);
  assert.doesNotMatch(api, /costo por metro/i);
  assert.doesNotMatch(api, /probabilidad de falla calculada/i);
});

test('Equipment 360 shows comparable 12 month windows without diagnosis language', () => {
  assert.match(panel, /Tendencia costo \+ condición/);
  assert.match(panel, /dos ventanas consecutivas de 12 meses/);
  assert.match(panel, /Coincidencia temporal no implica causalidad/);
  assert.match(panel, /Restricciones externas/);
  assert.match(panel, /Cobertura insuficiente/);
  assert.match(ficha, /AssetEconomicConditionTrend/);
  assert.match(ficha, /<AssetEconomicConditionTrend assetId=\{assetId\} \/>/);
});
