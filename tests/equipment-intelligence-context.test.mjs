import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helper = await readFile(new URL('../lib/intelligence/equipment-intelligence-context.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/equipment/context/route.ts', import.meta.url), 'utf8');

test('equipment context is tenant scoped and uses canonical maintenance evidence', () => {
  assert.match(helper, /maintenance_canonical_assets_v1/);
  assert.match(helper, /maintenance_operational_work_order_flow_v1/);
  assert.match(helper, /preventive_maintenance_hour_status_v1/);
  assert.match(helper, /asset_runtime_summary_v1/);
  assert.match(helper, /maintenance_reliability_by_asset_v1/);
  assert.match(helper, /maintenance_runtime_reliability_by_asset_v1/);
  assert.match(helper, /maintenance_work_orders/);
  assert.match(helper, /work_order_parts/);
  assert.match(helper, /\.eq\('organization_id', org\)/);
});

test('equipment mention resolver protects ambiguity instead of guessing', () => {
  assert.match(helper, /scored\.length > 1 && scored\[0\]\.score === scored\[1\]\.score/);
  assert.match(route, /ambiguityProtected/);
  assert.match(route, /explicit_asset_mention/);
});

test('equipment intelligence keeps runtime reliability and parts semantics honest', () => {
  assert.match(helper, /no llamar MTBF a horómetro/);
  assert.match(helper, /no inferir stock disponible/);
  assert.match(helper, /recurrencia observada no es predicción de falla/);
  assert.match(route, /Horómetro\/runtime y MTBF son conceptos separados/);
  assert.match(route, /no equivale a stock disponible/);
});

test('equipment context exposes evidence coverage and never turns missing sources into zero truth', () => {
  assert.match(helper, /const coverage =/);
  assert.match(helper, /runtime: Boolean\(runtimeResult\.data\)/);
  assert.match(helper, /reliability: Boolean\(reliabilityResult\.data\)/);
  assert.match(helper, /runtimeReliability: Boolean\(runtimeReliabilityResult\.data\)/);
  assert.match(helper, /declarar la ausencia de evidencia y no convertirla en un cero operacional/);
});

test('reliability readiness explains empty metrics from observed work-order history without inventing thresholds', () => {
  assert.match(helper, /const reliabilityReadiness =/);
  assert.match(helper, /no_closed_history/);
  assert.match(helper, /closed_history_without_corrective_events/);
  assert.match(helper, /closed_corrective_history_present_but_audited_metrics_unavailable/);
  assert.match(helper, /audited_reliability_available/);
  assert.match(helper, /closedOrdersObserved/);
  assert.match(helper, /closedCorrectiveOrdersObserved/);
  assert.match(helper, /closedCorrectiveWithRootCauseObserved/);
  assert.match(helper, /Readiness describes observed evidence coverage only/);
  assert.doesNotMatch(helper, /reliabilityReadiness[\s\S]*score:\s*\d/);
});

test('equipment context remains read-only and permission guarded', () => {
  assert.match(route, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /method:\s*['"]POST['"]/);
  assert.doesNotMatch(helper, /\.insert\(/);
  assert.doesNotMatch(helper, /\.update\(/);
  assert.doesNotMatch(helper, /\.delete\(/);
});
