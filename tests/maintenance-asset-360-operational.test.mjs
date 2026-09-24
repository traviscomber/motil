import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/assets/[id]/operational-360/route.ts', 'utf8');
const ui = fs.readFileSync('components/maintenance/asset-360-overview.tsx', 'utf8');
const assetsApi = fs.readFileSync('app/api/maintenance/assets/route.ts', 'utf8');

test('asset 360 API is maintenance authorized tenant scoped and composes existing evidence', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /maintenance_operational_work_order_flow_v1/);
  assert.match(api, /work_order_close_readiness_v2/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /asset_runtime_summary_v1/);
  assert.match(api, /maintenance_reliability_by_asset_v1/);
  assert.match(api, /maintenance_runtime_reliability_by_asset_v1/);
});

test('asset 360 UI refuses legacy calendar MTBF and historical mixed cost', () => {
  assert.doesNotMatch(ui, /hoursBetween/);
  assert.doesNotMatch(ui, /completedDates/);
  assert.match(ui, /MTBF real/);
  assert.match(ui, /valid_mtbf_intervals/);
  assert.match(ui, /Sin base/);
  assert.match(ui, /costos históricos se muestran desde registros económicos enlazados al activo/);
  assert.match(ui, /costos auditados, desde cierres cuando existen/);
});

test('asset 360 surfaces next preventive closure and reliability in one view', () => {
  assert.match(ui, /Próximo preventivo/);
  assert.match(ui, /Confiabilidad auditada/);
  assert.match(ui, /Cierre y ejecución/);
  assert.match(ui, /Continuar trabajo/);
  assert.match(ui, /preventivo-horas/);
  assert.match(ui, /ordenes-trabajo\/cierre/);
});

test('asset 360 keeps secondary evidence consolidated', () => {
  assert.match(ui, /title="Compras y abastecimiento"/);
  assert.doesNotMatch(ui, /SectionSummary title="Abastecimiento de mantención"/);
  assert.doesNotMatch(ui, /SectionSummary title="Compras y proveedores"/);

  assert.match(ui, /title="Cobertura y trazabilidad"/);
  assert.doesNotMatch(ui, /SectionSummary title="Cobertura"/);
  assert.doesNotMatch(ui, /SectionSummary title="Trazabilidad"/);

  assert.match(ui, /Evolución anual/);
  assert.doesNotMatch(ui, /SectionSummary title="Costos por año"/);
  assert.doesNotMatch(ui, /SectionSummary title="Actividad reciente"/);
  assert.doesNotMatch(ui, /label="OT históricas"/);
});

test('asset 360 resolves canonical location and exact cost center evidence', () => {
  assert.match(api, /deriveMachinesFromCostCenters/);
  assert.match(api, /from\('cost_centers'\)/);
  assert.match(api, /normalizeAssetIdentity\(machine\.name\) === normalizedAssetIdentity/);
  assert.match(api, /exactCostCenterMatches\.length === 1/);
  assert.match(api, /normalizeLocationEvidence/);
  assert.match(api, /normalizedLocations\.size === 1/);
  assert.match(api, /operationalStateResult\.data\?\.location/);
  assert.match(api, /cost_center_code: normalizedAsset\.cost_center_code \|\| exactCostCenter\?\.code \|\| null/);
});

test('asset 360 surfaces planning or schedule horometer without inventing runtime history', () => {
  assert.match(api, /planningMeterHistory/);
  assert.match(api, /preventiveMeterSnapshot/);
  assert.match(api, /meter_evidence_source: resolvedMeterEvidenceSource/);
  assert.match(ui, /runtimeCostIntelligence\?\.latest_meter_hours != null/);
  assert.match(ui, /sin historial cronológico de lecturas/);
});

test('asset 360 does not render missing evidence as zero or raw source errors', () => {
  assert.match(ui, /cleanEvidenceText/);
  assert.match(ui, /Sin metros registrados/);
  assert.match(ui, /Sin cantidad/);
  assert.match(ui, /Sin lectura/);
  assert.doesNotMatch(ui, /number\(row\.drilled_meters \|\| 0/);
  assert.doesNotMatch(ui, /number\(row\.meter_value \|\| 0/);
});

test('equipment list hides active canonical aliases instead of deleting evidence', () => {
  assert.match(assetsApi, /asset_identity_unified_preview_v1/);
  assert.match(assetsApi, /canonicalized/);
  assert.match(assetsApi, /aliasedSourceIds/);
  assert.match(assetsApi, /deduplicatedAliases/);
});

test('asset 360 deduplicates repeated meter observations without deleting source evidence', () => {
  assert.match(api, /dedupeMeterHistory/);
  assert.match(api, /workbook_history: 1/);
  assert.match(api, /workbook_current: 2/);
  assert.match(api, /workbook_initial: 3/);
  assert.match(api, /\.limit\(24\)/);
  assert.match(api, /dedupeMeterHistory\(meterHistoryResult\.data \|\| \[\]\)/);
});

test('asset 360 rejects placeholder locations as operational evidence', () => {
  assert.match(api, /SIN MINA ASIGNADA/);
  assert.match(api, /SIN ASIGNAR/);
  assert.match(api, /NO ASIGNADO/);
  assert.match(api, /#ERROR!/);
});

