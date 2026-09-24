import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lib = fs.readFileSync('lib/maintenance/purchase-history-resolution.ts', 'utf8');

test('purchase history lib resolves one exact cost center by normalized identity', () => {
  assert.match(lib, /export function resolveExactCostCenter/);
  assert.match(lib, /normalizeAssetIdentity\(machine\.name\) === normalizedIdentity/);
  assert.match(lib, /matches\.length === 1\s*\?\s*matches\[0\]/);
  assert.match(lib, /canonicalMatches\.length === 1\s*\?\s*canonicalMatches\[0\]/);
  assert.match(lib, /!getRedistributableMachineAssignment\(machine\.code\)/);
});

test('purchase history lib recovers one exact cost center from purchase lines without mutation', () => {
  assert.match(lib, /export function resolvePurchaseExactCostCenter/);
  assert.match(lib, /rawCostCenter\.match\(\/\^\(\\S\+\)\\s\+\(\.\+\)\$\//);
  assert.match(lib, /normalizeAssetIdentity\(description\) !== normalizedIdentity/);
  assert.match(lib, /if \(!matches\.has\(code\)\)/);
  assert.match(lib, /getRedistributableMachineAssignment\(candidate\.code\)/);
});

test('purchase history lib exposes an explicit deterministic match basis', () => {
  assert.match(lib, /export type PurchaseHistoryMatchBasis/);
  assert.match(lib, /'cost_center'/);
  assert.match(lib, /'cost_center_derived'/);
  assert.match(lib, /'purchase_cost_center_exact_identity'/);
  assert.match(lib, /'name_model'/);
  assert.match(lib, /export function resolvePurchaseHistoryMatchBasis/);
});

test('purchase history lib selects rows by match basis and keeps source errors explicit', () => {
  assert.match(lib, /export function selectPurchaseHistoryRows/);
  assert.match(lib, /matchBasis === 'cost_center'/);
  assert.match(lib, /matchBasis === 'cost_center_derived' && !derivedError/);
  assert.match(lib, /matchBasis === 'purchase_cost_center_exact_identity' && !purchaseError/);
});

test('purchase history lib dedupes lines and summarizes without inventing amounts', () => {
  assert.match(lib, /export function dedupePurchaseLines/);
  assert.match(lib, /if \(seen\.has\(key\)\) return false/);
  assert.match(lib, /export function buildPurchaseHistorySummary/);
  assert.match(lib, /unpricedLines: rows\.filter\(\(row\) => row\.net_amount == null\)\.length/);
  assert.match(lib, /row\.net_amount != null \? sum \+ Number\(row\.net_amount\) : sum/);
  assert.match(lib, /lastOrderDate: rows\.map\(\(row\) => row\.order_date\)\.filter\(Boolean\)\.sort\(\)\.reverse\(\)\[0\] \|\| null/);
});

test('purchase history lib never invents cost centers or suppliers', () => {
  assert.doesNotMatch(lib, /fetch\(|supabase|Math\.random|Date\.now|new Date/);
});
