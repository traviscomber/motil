import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const library = fs.readFileSync('lib/intelligence/regulatory-evidence-link.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/regulatory/evidence-linking/route.ts', 'utf8');

test('regulatory evidence linking never declares compliance', () => {
  assert.match(library, /evidence_linking_never_declares_legal_compliance/);
  assert.match(library, /canonical_operational_sources_remain_authoritative/);
  assert.match(library, /missing_reference_is_a_validation_gap_not_proof_of_non_compliance/);
});

test('not applicable requires human validation', () => {
  assert.match(library, /notApplicableBoundary: 'not_applicable_requires_human_validation'/);
  assert.match(library, /humanValidatedNotApplicable \? 'not_applicable' : 'requires_review'/);
});

test('evidence status remains deterministic and advisory', () => {
  assert.match(library, /'observed'/);
  assert.match(library, /'missing'/);
  assert.match(library, /'requires_review'/);
  assert.doesNotMatch(library, /openai|anthropic|gemini/i);
});

test('regulatory evidence endpoint is read-only', () => {
  assert.match(route, /export async function GET\(\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /advisory_reference_only/);
});
