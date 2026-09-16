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
  assert.match(api, /maintenance_reliability_by_root_cause_v1/);
  assert.match(api, /maintenance_operational_work_order_flow_v1/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /production_drilling_source_reports/);
  assert.match(api, /asset_runtime_summary_v1/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /No se atribuye a una falla ni a una OT/);
  assert.match(api, /no representan probabilidad de falla ni un score predictivo/);
});

test('asset history separates imported economics, observed use and audited causes', () => {
  assert.match(api, /historicalEconomics/);
  assert.match(api, /observedUse/);
  assert.match(api, /auditedReliability/);
  assert.match(api, /Metros perforados no equivalen a horas de operación/);
  assert.match(api, /no es costo por metro ni demuestra causalidad/);
  assert.match(api, /Costo de ejecución moderna sólo desde cierres auditados/);
  assert.match(panel, /Costo histórico reconocido/);
  assert.match(panel, /Uso observado/);
  assert.match(panel, /Condición observada/);
  assert.match(panel, /Causa confirmada/);
  assert.match(panel, /Esto describe gasto, no causa de falla/);
  assert.match(panel, /No se presenta como costo por metro, costo por hora ni efecto de una falla/);
});

test('observed condition is not promoted to mechanical diagnosis', () => {
  assert.match(api, /external_constraint_reports/);
  assert.match(api, /equipment_without_crew_raw/);
  assert.match(api, /power_outage_raw/);
  assert.match(api, /water_shortage_raw/);
  assert.match(api, /sirven para priorizar revisión, no para afirmar causa mecánica/);
  assert.match(panel, /Restricciones externas/);
  assert.match(panel, /Agua, energía o falta de dotación reportadas/);
  assert.match(panel, /no se clasifican automáticamente como falla mecánica/);
  assert.match(panel, /No usar todavía para costo\/hora o MTBF por horas/);
});

test('equipment 360 embeds the economic operational history', () => {
  assert.match(panel, /\/api\/maintenance\/assets\/\$\{encodeURIComponent\(assetId\)\}\/economic-operational-history/);
  assert.match(panel, /Qué requiere atención/);
  assert.match(panel, /Puente entre costo, uso y falla/);
  assert.match(ficha, /AssetEconomicOperationalHistory/);
  assert.match(ficha, /<AssetEconomicOperationalHistory assetId=\{assetId\} \/>/);
});
