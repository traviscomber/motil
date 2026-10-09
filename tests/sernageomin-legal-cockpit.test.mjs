import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/legal/sernageomin/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/legal/sernageomin/page.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/legal/layout.tsx', 'utf8');
const obligations = fs.readFileSync('lib/intelligence/sernageomin-obligations.ts', 'utf8');

test('regulatory inbox stays read-only, permission aware and tenant scoped', () => {
  assert.match(api, /getOrganizationContext/);
  assert.match(api, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(api, /export async function GET/);
  assert.doesNotMatch(api, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(api, /complianceVerdictCalculated: false/);
  assert.match(api, /operationalMutationExecuted: false/);
});

test('evidence matching is contextual and never becomes a compliance verdict', () => {
  assert.match(api, /evidenceKeywords/);
  assert.match(api, /evidence_observed_requires_review/);
  assert.match(api, /evidence_not_observed_requires_review/);
  assert.match(page, /Esto no prueba incumplimiento ni que la obligación aplique/);
  assert.match(page, /SERNAGEOMIN aparece como autoridad y fuente, no como un silo de trabajo/);
});

test('legal inbox exposes ownership, action, risk, timing and evidence', () => {
  assert.match(page, /item\.businessOwner/);
  assert.match(page, /item\.legalRole/);
  assert.match(page, /item\.nextAction/);
  assert.match(page, /item\.riskIfUnmanaged/);
  assert.match(page, /item\.timingRule/);
  assert.match(page, /item\.expectedEvidence/);
  assert.match(page, /item\.evidenceRefs/);
  assert.match(layout, /label: 'Obligaciones'/);
});

test('catalog encodes mining legal operating roles', () => {
  assert.match(obligations, /businessOwner:/);
  assert.match(obligations, /legalRole:/);
  assert.match(obligations, /contributors:/);
  assert.match(obligations, /riskIfUnmanaged:/);
  assert.match(obligations, /evidenceKeywords:/);
});

test('critical accident timing is explicit while uncertain deadlines remain validation gated', () => {
  assert.match(obligations, /dentro de 24 horas/);
  assert.match(obligations, /dentro de 15 días/);
  assert.match(obligations, /validar fecha de corte/);
  assert.match(obligations, /no inferir plazo/);
});

test('Legal can locate the technical Engineering contact without granting Legal access or crossing tenants', () => {
  assert.match(api, /engineering: \['prod_topografia'\]/);
  assert.match(api, /loadModulePeople\(context\.supabase, allModuleKeys, context\.organizationId\)/);
  assert.match(api, /\.eq\('organization_id', organizationId\)/);
  assert.match(api, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.doesNotMatch(api, /engineering: \['legal_modulo'\]/);
});
