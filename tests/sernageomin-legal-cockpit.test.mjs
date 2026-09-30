import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/legal/sernageomin/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/legal/sernageomin/page.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/legal/layout.tsx', 'utf8');
const obligations = fs.readFileSync('lib/intelligence/sernageomin-obligations.ts', 'utf8');

test('cockpit API is read-only, permission aware and tenant scoped through regulatory context', () => {
  assert.match(api, /getOrganizationContext/);
  assert.match(api, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(api, /export async function GET/);
  assert.doesNotMatch(api, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(api, /complianceVerdictCalculated: false/);
  assert.match(api, /operationalMutationExecuted: false/);
});

test('cockpit never converts observed evidence into legal compliance', () => {
  assert.match(api, /evidence_observed_requires_review/);
  assert.match(api, /evidence_not_observed_requires_review/);
  assert.match(api, /requires_human_validation/);
  assert.doesNotMatch(api, /compliant|non_compliant/);
  assert.match(page, /Esto no prueba ausencia ni incumplimiento/);
  assert.match(page, /Esta vista no declara cumplimiento legal/);
});

test('cockpit exposes timing, ownership, applicability and evidence', () => {
  assert.match(page, /item\.timingRule/);
  assert.match(page, /item\.responsibleFunctions/);
  assert.match(page, /item\.applicabilityNote/);
  assert.match(page, /item\.expectedEvidence/);
  assert.match(page, /item\.evidenceRefs/);
  assert.match(layout, /\/dashboard\/legal\/sernageomin/);
});

test('critical accident timing is explicit while uncertain deadlines remain validation gated', () => {
  assert.match(obligations, /dentro de 24 horas/);
  assert.match(obligations, /dentro de 15 días/);
  assert.match(obligations, /validar fecha de corte/);
  assert.match(obligations, /no inferir plazo/);
});
