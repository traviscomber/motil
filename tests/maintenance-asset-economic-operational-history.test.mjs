import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/maintenance/assets/[id]/economic-operational-history/route.ts', 'utf8');
const panel = fs.readFileSync('components/maintenance/asset-economic-operational-history.tsx', 'utf8');
const ficha = fs.readFileSync('app/dashboard/mantenimiento/equipos/[id]/ficha/page.tsx', 'utf8');

test('asset economic history stays tenant scoped and evidence based', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /canonical_clp_cost_ledger/);
  assert.match(api, /maintenance_reliability_by_asset_v1/);
  assert.match(api, /maintenance_operational_work_order_flow_v1/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /No se atribuye a una falla ni a una OT/);
  assert.match(api, /no representan probabilidad de falla ni un score predictivo/);
});

test('asset history separates imported economics from audited execution', () => {
  assert.match(api, /historicalEconomics/);
  assert.match(api, /auditedReliability/);
  assert.match(api, /Costo de ejecución moderna sólo desde cierres auditados/);
  assert.match(panel, /Costo histórico reconocido/);
  assert.match(panel, /Costo moderno auditado/);
  assert.match(panel, /Esto describe gasto, no causa de falla/);
});

test('equipment 360 embeds the economic operational history', () => {
  assert.match(panel, /\/api\/maintenance\/assets\/\$\{encodeURIComponent\(assetId\)\}\/economic-operational-history/);
  assert.match(panel, /Qué requiere atención/);
  assert.match(ficha, /AssetEconomicOperationalHistory/);
  assert.match(ficha, /<AssetEconomicOperationalHistory assetId=\{assetId\} \/>/);
});
