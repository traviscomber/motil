import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const health = fs.readFileSync('app/api/data-quality/health/route.ts', 'utf8');

test('maintenance data health exposes canonical reconciliation and meter integrity', () => {
  assert.match(health, /maintenance_asset_reconciliation_v1/);
  assert.match(health, /planning_asset_meter_observations_v1/);
  assert.match(health, /canonical_assets_current/);
  assert.match(health, /Conciliaciones determinísticas pendientes/);
  assert.match(health, /Casos que requieren revisión humana/);
  assert.match(health, /Filas duplicadas de medidor absorbidas/);
});

test('maintenance data health preserves unavailable counts as null instead of fake zero', () => {
  assert.match(health, /activeMaintenanceAssets\.count \?\? null/);
  assert.match(health, /deterministicReconciliation\.count \?\? null/);
  assert.match(health, /reviewRequiredReconciliation\.count \?\? null/);
  assert.match(health, /rawMeterRows\.count \?\? null/);
  assert.match(health, /meterObservations\.count \?\? null/);
  assert.match(health, /rawMeterCount !== null && observationCount !== null/);
});

test('maintenance data health keeps human review above automatic inference', () => {
  assert.match(health, /review_required/);
  assert.match(health, /Revisar sólo los casos contradictorios; no inferir el maestro/);
  assert.match(health, /Validar las conciliaciones determinísticas antes de materializarlas/);
});
