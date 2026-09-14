import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const recurrence = fs.readFileSync('app/api/intelligence/maintenance/recurrence/route.ts', 'utf8');
const timelineHelper = fs.readFileSync('lib/intelligence/decision-case-timeline.ts', 'utf8');
const timelineRoute = fs.readFileSync('app/api/intelligence/decision-cases/timeline/route.ts', 'utf8');
const confidence = fs.readFileSync('lib/intelligence/source-confidence.ts', 'utf8');
const sourceHealth = fs.readFileSync('app/api/intelligence/source-health/route.ts', 'utf8');
const regulatory = fs.readFileSync('lib/intelligence/regulatory-sources.ts', 'utf8');

test('recurrence intelligence stays evidence-backed and advisory', () => {
  assert.match(recurrence, /MODULE_KEYS\.MANT_GERENCIAL/);
  assert.match(recurrence, /maintenance_reliability_by_root_cause_v1/);
  assert.match(recurrence, /maintenance_runtime_reliability_by_asset_v1/);
  assert.match(recurrence, /\.eq\('is_recurring', true\)/);
  assert.match(recurrence, /authority: 'advisory_only'/);
  assert.match(recurrence, /no equivale a causa raíz definitiva, probabilidad futura ni riesgo calculado/);
  assert.doesNotMatch(recurrence, /export async function (POST|PUT|PATCH|DELETE)/);
});

test('decision timeline separates advisory events from human actions', () => {
  assert.match(timelineHelper, /'detected' \| 'reviewed' \| 'revalidated' \| 'resolved' \| 'updated'/);
  assert.match(timelineHelper, /authority: 'advisory_only' \| 'human_action'/);
  assert.match(timelineHelper, /missing actor or comment is not invented/);
  assert.match(timelineRoute, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(timelineRoute, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(timelineRoute, /filterAccessibleDecisionCaseDomains/);
  assert.doesNotMatch(timelineRoute, /export async function (POST|PUT|PATCH|DELETE)/);
});

test('source health exposes deterministic freshness and confidence without probabilities', () => {
  assert.match(confidence, /ageDays <= 2/);
  assert.match(confidence, /ageDays <= 7/);
  assert.match(confidence, /confidence: 'unknown'/);
  assert.match(confidence, /not a probability of correctness/);
  for (const source of ['production_fine_flow_daily_v1','maintenance_work_orders','canonical_inventory_current','canonical_purchase_orders_current','canonical_finance_overview']) {
    assert.match(sourceHealth, new RegExp(source));
  }
  assert.match(sourceHealth, /resolveExecutiveAccess/);
  assert.match(sourceHealth, /operationalMutationExecuted: false/);
});

test('SERNAGEOMIN knowledge packs include 2025 technical guides with regulatory boundaries', () => {
  for (const id of [
    'sernageomin-hydrometallurgical-plants-2025',
    'sernageomin-tailings-project-guide-2025',
    'sernageomin-trolley-assist-2025',
    'sernageomin-decarbonization-technologies-2025',
    'sernageomin-closure-technical-guides',
  ]) assert.match(regulatory, new RegExp(id));
  assert.match(regulatory, /https:\/\/www\.sernageomin\.cl\/proyectos-mineros\//);
  assert.match(regulatory, /https:\/\/www\.sernageomin\.cl\/guias-aspectos-tecnicos-planes-de-cierre\//);
  assert.match(regulatory, /never proves site compliance/);
});
