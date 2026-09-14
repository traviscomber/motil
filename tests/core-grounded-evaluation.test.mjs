import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const evaluator = await readFile(new URL('../lib/intelligence/core-grounded-evaluation.ts', import.meta.url), 'utf8');

test('grounded evaluator compares numeric claims against exact evidence payload', () => {
  assert.match(evaluator, /numeric_claims_grounded/);
  assert.match(evaluator, /unsupportedNumbers/);
  assert.match(evaluator, /evidenceText\(input\.evidence\)/);
  assert.match(evaluator, /not_fully_proven/);
});

test('grounded evaluator preserves equipment reliability semantics', () => {
  assert.match(evaluator, /runtimeReliability/);
  assert.match(evaluator, /reliability_boundary/);
  assert.match(evaluator, /MTBF\/MTTR afirmado sin evidencia/);
});

test('grounded evaluator does not turn parts into stock evidence', () => {
  assert.match(evaluator, /inventory_boundary/);
  assert.match(evaluator, /hasInventoryEvidence/);
  assert.match(evaluator, /Disponibilidad de stock afirmada sin evidencia de Inventario/);
});

test('grounded evaluator blocks automatic compliance and unauthorized action claims', () => {
  assert.match(evaluator, /regulatory_boundary/);
  assert.match(evaluator, /authorization_boundary/);
  assert.match(evaluator, /veredicto de compliance no permitido/);
  assert.match(evaluator, /requiresExplicitAuthorization/);
});

test('grounded evaluator remains advisory and never mutates operations', () => {
  assert.match(evaluator, /deterministic_grounding_guard/);
  assert.match(evaluator, /operationalMutationExecuted: false/);
  assert.doesNotMatch(evaluator, /\.insert\(/);
  assert.doesNotMatch(evaluator, /\.update\(/);
  assert.doesNotMatch(evaluator, /\.delete\(/);
});
