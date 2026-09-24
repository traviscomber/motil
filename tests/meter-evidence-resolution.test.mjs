import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lib = fs.readFileSync('lib/maintenance/meter-evidence-resolution.ts', 'utf8');

test('meter evidence lib dedupes readings by asset timestamp value and unit signature', () => {
  assert.match(lib, /export function dedupeMeterReadings/);
  assert.match(lib, /const signature = \(row: MeterReadingRow\)/);
  assert.match(lib, /row\.canonical_asset_id \|\| assetId/);
  assert.match(lib, /if \(!map\.has\(key\)\) map\.set\(key, row\)/);
  assert.match(lib, /duplicateRowsIgnored: Math\.max\(rows\.length - deduped\.length, 0\)/);
});

test('meter evidence lib flags material decreases above one unit between chronological readings', () => {
  assert.match(lib, /export function countMaterialMeterDecreases/);
  assert.match(lib, /previous - current > 1/);
  assert.match(lib, /Number\.isFinite\(previous\) && Number\.isFinite\(current\)/);
});

test('meter evidence lib rejects zero schedule snapshots as observed meter evidence', () => {
  assert.match(lib, /export function resolvePreventiveMeterSnapshot/);
  assert.match(lib, /value === 0 && String\(row\.meter_evidence_source \|\| ''\)\.toLowerCase\(\) === 'schedule_snapshot'/);
  assert.match(lib, /unique\.length === 1 \? unique\[0\] : null/);
});

test('meter evidence lib treats annual planning units as periodicity not numeric evidence', () => {
  assert.match(lib, /export function resolvePlanningCurrentMeter/);
  assert.match(lib, /!\['anual', 'annual'\]\.includes\(meterUnit\)/);
  assert.match(lib, /row\.current_reading !== null &&\s*row\.current_reading !== undefined/);
});

test('meter evidence lib assembles runtime cost intelligence from explicit evidence only', () => {
  assert.match(lib, /export function buildRuntimeCostIntelligence/);
  assert.match(lib, /base\?\.latest_meter_hours \?\?/);
  assert.match(lib, /'asset_runtime_readings'/);
  assert.match(lib, /'planning_maintenance_source_rows'/);
  assert.match(lib, /'schedule_snapshot'/);
  assert.match(lib, /duplicate_meter_rows_ignored: duplicateRowsIgnored/);
  assert.match(lib, /material_meter_decrease_count: materialMeterDecreases/);
  assert.match(lib, /meter_sequence_status: materialMeterDecreases > 0 \? 'review_required' : 'consistent'/);
  assert.match(lib, /if \(latestMeter == null && !base\) return null/);
});

test('meter evidence lib never invents readings or timestamps', () => {
  assert.doesNotMatch(lib, /fetch\(|supabase|Math\.random|Date\.now|new Date/);
});
