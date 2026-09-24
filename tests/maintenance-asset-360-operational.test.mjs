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
  assert.match(ui, /Gasto reconocido y enlazado al equipo/);
  assert.match(ui, /Sólo cierres auditados y horas observadas/);
});

test('asset 360 surfaces next preventive closure and reliability in one view', () => {
  assert.match(ui, /Próxima intervención/);
  assert.match(ui, /Confiabilidad auditada/);
  assert.match(ui, /Trabajo en curso/);
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

  assert.match(ui, /Detalle económico/);
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
  assert.match(api, /operationalLocation \|\| payloadLocation \|\| evidenceLocation \|\| null/);
  assert.match(api, /cost_center_code: normalizedAsset\.cost_center_code \|\| exactCostCenter\?\.code \|\| null/);
  assert.match(api, /cost_center_evidence_source/);
  assert.match(api, /location_evidence_source/);
});

test('asset 360 rejects placeholder state and prefers validated operational evidence', () => {
  assert.match(api, /cleanCategoricalEvidence/);
  assert.match(api, /operationalCriticality \|\| payloadCriticality \|\| evidenceCriticality \|\| null/);
  assert.match(api, /operationalStatus \|\| payloadStatus \|\| null/);
  assert.match(api, /asset_operational_state_v1/);
  assert.match(api, /operational_status_evidence_source/);
});

test('asset 360 keeps inferred family referential rather than canonical', () => {
  assert.match(api, /inferMachineFamilyFromText/);
  assert.match(api, /reference_family: referenceFamily \|\| null/);
  assert.match(api, /deterministic_name_classifier/);
  assert.match(ui, /Familia referencial/);
  assert.match(ui, /no canónico/);
});

test('asset 360 can recover a strongly formatted Chilean plate without overwriting canonical identity', () => {
  assert.match(api, /inferChileanPlateFromName/);
  assert.match(api, /normalizedAsset\.license_plate \|\| inferredLicensePlate \|\| null/);
  assert.match(api, /deterministic_name_plate/);
  assert.match(ui, /Patente extraída del nombre con formato validado/);
});

test('asset 360 surfaces planning or schedule horometer without inventing runtime history', () => {
  assert.match(api, /planningMeterHistory/);
  assert.match(api, /preventiveMeterSnapshot/);
  assert.match(api, /meter_evidence_source: resolvedMeterEvidenceSource/);
  assert.match(ui, /data\.runtimeCostIntelligence\?\.latest_meter_hours != null/);
  assert.match(ui, /runtimeCostIntelligence\?\.latest_meter_hours != null/);
  assert.match(ui, /sin historial cronológico enlazado/);
});

test('asset 360 flags material planning meter decreases without calling them resets', () => {
  assert.match(api, /materialMeterDecreaseCount/);
  assert.match(api, /previous - current > 1/);
  assert.match(api, /meter_sequence_status/);
  assert.match(ui, /descenso material por revisar/);
});

test('asset 360 separates consolidated drilling totals from the visible recent sample', () => {
  assert.match(api, /last_drilling_date/);
  assert.match(ui, /consolidatedDrillingMeters/);
  assert.match(ui, /Metros perforados acumulados/);
  assert.match(ui, /reportes enlazados/);
  assert.match(ui, /recentDrillingMeters/);
  assert.match(ui, /muestra visible/);
});

test('asset 360 does not render missing evidence as zero or raw source errors', () => {
  assert.match(ui, /cleanEvidenceText/);
  assert.match(ui, /Sin metros registrados/);
  assert.match(ui, /Sin cantidad/);
  assert.match(ui, /Sin lectura/);
  assert.doesNotMatch(ui, /number\(row\.drilled_meters \|\| 0/);
  assert.doesNotMatch(ui, /number\(row\.meter_value \|\| 0/);
});

test('asset 360 hides absent identity fields from the primary header', () => {
  assert.match(ui, /const primaryIdentity = \[/);
  assert.match(ui, /asset\.cost_center_code \?/);
  assert.match(ui, /asset\.location \?/);
  assert.match(ui, /primaryIdentity\.length > 0/);
  assert.doesNotMatch(ui, /label="N° de serie"[\s\S]{0,120}value=\{scope === 'vehiculos'/);
});

test('equipment list trusts the canonical active state for deduplicated fleet identity', () => {
  assert.match(assetsApi, /\.eq\('is_active', true\)/);
  assert.doesNotMatch(assetsApi, /asset_identity_unified_preview_v1/);
  assert.doesNotMatch(assetsApi, /deduplicatedAliases/);
});

test('asset 360 consumes the canonical deduplicated meter observation model', () => {
  assert.match(api, /planning_asset_meter_observations_v1/);
  assert.match(api, /evidence_row_count/);
  assert.match(api, /\.limit\(12\)/);
  assert.doesNotMatch(api, /dedupeMeterHistory/);
});

test('asset 360 rejects placeholder locations as operational evidence', () => {
  assert.match(api, /SIN MINA ASIGNADA/);
  assert.match(api, /SIN ASIGNAR/);
  assert.match(api, /NO ASIGNADO/);
  assert.match(api, /#ERROR!/);
});

test('equipment fleet API excludes inactive canonical assets from the operational list', () => {
  assert.match(assetsApi, /\.eq\('is_active', true\)/);
});

test('asset 360 derives criticality only from one consistent planning value', () => {
  assert.match(api, /planningCriticalities/);
  assert.match(api, /planningCriticalities\.size === 1/);
  assert.match(api, /criticality: operationalCriticality \|\| payloadCriticality \|\| evidenceCriticality \|\| null/);
  assert.match(api, /criticality_evidence_source/);
  assert.match(api, /planning_maintenance_source_rows/);
});

test('asset 360 uses a uniquely derived cost center for purchase history', () => {
  assert.match(api, /derivedCostCenterPurchaseHistoryResult/);
  assert.match(api, /exactCostCenter\?\.code/);
  assert.match(api, /cost_center_derived/);
  assert.match(api, /canonical_purchase_order_lines_current/);
  assert.match(api, /derived cost center purchase history unavailable/);
});

test('asset 360 preserves unpriced purchase lines instead of silently treating them as zero', () => {
  assert.match(api, /unpricedLines/);
  assert.match(api, /row\.net_amount != null \? sum \+ Number\(row\.net_amount\) : sum/);
  assert.match(ui, /Gasto histórico neto registrado/);
  assert.match(ui, /líneas sin monto/);
});

test('asset 360 labels deterministically derived cost center purchase context correctly', () => {
  assert.match(ui, /cost_center_derived/);
  assert.match(ui, /resuelto de forma determinística/);
});

test('asset 360 prefers one canonical cost center when duplicate names are redistributable aliases', () => {
  assert.match(api, /getRedistributableMachineAssignment/);
  assert.match(api, /canonicalExactCostCenterMatches/);
  assert.match(api, /!getRedistributableMachineAssignment\(machine\.code\)/);
  assert.match(api, /canonicalExactCostCenterMatches\.length === 1/);
});

