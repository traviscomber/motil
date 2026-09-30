import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const obligations = fs.readFileSync('lib/intelligence/sernageomin-obligations.ts', 'utf8');
const context = fs.readFileSync('lib/intelligence/regulatory-intelligence-context.ts', 'utf8');

test('SERNAGEOMIN obligations remain advisory and human validated', () => {
  assert.match(obligations, /does not determine legal applicability or prove compliance/);
  assert.match(obligations, /humanValidationRequired: true/);
  assert.doesNotMatch(obligations, /compliant: true|non_compliant: true/);
});

test('catalog covers core operational SERNAGEOMIN duty families', () => {
  assert.match(obligations, /approved-project-and-closure-plan/);
  assert.match(obligations, /start-restart-notice/);
  assert.match(obligations, /accident-high-potential-notice/);
  assert.match(obligations, /monthly-accidentability/);
  assert.match(obligations, /inspection-findings-response/);
  assert.match(obligations, /tailings-e700/);
  assert.match(obligations, /closure-lifecycle/);
});

test('each obligation carries source, trigger, evidence and MOTIL domain mapping', () => {
  assert.match(obligations, /sourceUrl:/);
  assert.match(obligations, /trigger:/);
  assert.match(obligations, /expectedEvidence:/);
  assert.match(obligations, /motilDomains:/);
});

test('regulatory context exposes obligations separately from canonical evidence', () => {
  assert.match(context, /listSernageominObligations/);
  assert.match(context, /obligationCount: obligations\.length/);
  assert.match(context, /obligationPolicy: SERNAGEOMIN_OBLIGATIONS_POLICY/);
  assert.match(context, /complianceVerdictCalculated: false/);
});
