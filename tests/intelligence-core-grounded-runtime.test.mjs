import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url), 'utf8');

test('executive core evaluates the exact evidence object used for the answer', () => {
  assert.match(route, /evaluateGroundedCoreResponse/);
  assert.match(route, /answer: result\.text/);
  assert.match(route, /evidence,/);
  assert.match(route, /sourceRefs: refs/);
  assert.match(route, /route,/);
});

test('grounded evaluation is persisted against the exact response message and tenant boundary', () => {
  assert.match(route, /\.from\('motil_ai_core_runs'\)/);
  assert.match(route, /evaluation_state: groundedEvaluation\.state/);
  assert.match(route, /evaluation_detail: groundedEvaluation/);
  assert.match(route, /evaluator_version: groundedEvaluation\.version/);
  assert.match(route, /evaluated_at: new Date\(\)\.toISOString\(\)/);
  assert.match(route, /\.eq\('organization_id', org\)/);
  assert.match(route, /\.eq\('user_id', context\.userId\)/);
  assert.match(route, /\.eq\('response_message_id', persisted\.id\)/);
});

test('evaluation remains diagnostic and does not mutate operational sources', () => {
  const evaluationBlock = route.slice(route.indexOf('const groundedEvaluation ='), route.indexOf('let decisionCaseRevalidation'));
  assert.doesNotMatch(evaluationBlock, /maintenance_work_orders.*update|canonical_inventory_current.*update|canonical_purchase_orders_current.*update/);
  assert.match(route, /groundedEvaluationPersisted/);
});
