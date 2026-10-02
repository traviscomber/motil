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
  assert.match(economics, /Histórico importado/);
  assert.match(economics, /no reconciliado como costo auditado de OT/);
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
