import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/assets/[id]/operational-360/route.ts', import.meta.url);
const overviewUrl = new URL('../components/maintenance/asset-360-overview.tsx', import.meta.url);
const identityUrl = new URL('../components/maintenance/asset-360/identity-header.tsx', import.meta.url);
const economicsUrl = new URL('../components/maintenance/asset-360/economics-section.tsx', import.meta.url);
const coverageUrl = new URL('../components/maintenance/asset-360/coverage-section.tsx', import.meta.url);

test('Ficha 360 exposes canonical imported vehicle history without promoting it to audited truth', async () => {
  const [route, overview, identity, economics, coverage] = await Promise.all([
    readFile(routeUrl, 'utf8'),
    readFile(overviewUrl, 'utf8'),
    readFile(identityUrl, 'utf8'),
    readFile(economicsUrl, 'utf8'),
    readFile(coverageUrl, 'utf8'),
  ]);

  for (const field of ['source_year', 'source_assignment', 'source_last_record', 'source_maintenance_records', 'source_maintenance_spend']) {
    assert.match(route, new RegExp(field));
    assert.match(overview, new RegExp(field));
  }

  assert.match(identity, /Año informado/);
  assert.match(identity, /Asignación/);
  assert.match(identity, /Conteo histórico importado; no equivale a OT auditadas/);
  assert.match(economics, /Monto histórico importado/);
  assert.match(economics, /moneda no informada y no reconciliado como costo auditado de OT/);
  assert.match(coverage, /Histórico importado del maestro canónico/);
});

test('Ficha 360 coverage recognizes imported maintenance history while preserving source semantics', async () => {
  const overview = await readFile(overviewUrl, 'utf8');
  assert.match(overview, /hasImportedEconomicHistory/);
  assert.match(overview, /Histórico importado disponible/);
  assert.match(overview, /registros históricos importados/);
});


test('Ficha 360 surfaces canonical validation notes and lifecycle provenance', async () => {
  const [route, overview, lifecycle, coverage] = await Promise.all([
    readFile(routeUrl, 'utf8'),
    readFile(overviewUrl, 'utf8'),
    readFile(new URL('../components/maintenance/asset-360/lifecycle-section.tsx', import.meta.url), 'utf8'),
    readFile(coverageUrl, 'utf8'),
  ]);
  assert.match(route, /validation_notes/);
  assert.match(route, /lifecycle_changed_at/);
  assert.match(route, /lifecycle_changed_by/);
  assert.match(overview, /lifecycleChangedAt/);
  assert.match(lifecycle, /Estado de ciclo de vida/);
  assert.match(coverage, /Notas de calidad canónica/);
});


test('Ficha 360 includes canonical monthly drill economics when available', async () => {
  const [sources, route, overview, drilling] = await Promise.all([
    readFile(new URL('../lib/maintenance/asset-360-data-sources.ts', import.meta.url), 'utf8'),
    readFile(routeUrl, 'utf8'),
    readFile(overviewUrl, 'utf8'),
    readFile(new URL('../components/maintenance/asset-360/drilling-section.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(sources, /drill_asset_unit_economics_monthly_v1/);
  assert.match(route, /drillEconomicsMonthly/);
  assert.match(overview, /drillEconomicsMonthly/);
  assert.match(drilling, /Serie mensual costo \+ producción/);
  assert.match(drilling, /cost_clp_per_meter/);
});


test('Ficha 360 distinguishes unavailable canonical sources from missing evidence', async () => {
  const [overview, coverage] = await Promise.all([
    readFile(overviewUrl, 'utf8'),
    readFile(coverageUrl, 'utf8'),
  ]);
  assert.match(overview, /unavailableSources=\{data\.unavailableSources \|\| \[\]\}/);
  assert.match(coverage, /Fuentes temporalmente no disponibles/);
  assert.match(coverage, /no se interpretan como datos inexistentes/);
  assert.match(coverage, /drillEconomicsMonthly: 'Serie mensual costo \+ producción'/);
});
