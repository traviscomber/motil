import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const api = readFileSync(new URL('../app/api/sostenibilidad/corrective-actions/work-orders/route.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../components/sostenibilidad/corrective-action-ot-links.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../components/sostenibilidad/corrective-action-card.tsx', import.meta.url), 'utf8');

test('existing OT number is looked up within the authenticated organization', () => {
  assert.match(api, /\.eq\('work_order_number', orderNumber\)\.eq\('organization_id', context.organizationId\)/);
  assert.match(api, /ignoreDuplicates: true/);
});
test('corrective action card links without altering source statuses', () => {
  assert.match(card, /<CorrectiveActionOtLinks actionId=\{action.id\}/);
  assert.match(form, /workOrderNumber: value/);
  assert.match(form, /aprobación y la verificación HSE siguen siendo independientes/);
  assert.doesNotMatch(api, /\.update\(\{\s*status/);
});

test('link list displays canonical OT identity and separates HSE verification', () => {
  assert.match(api, /maintenance_work_orders!inner\(work_order_number, status\)/);
  assert.match(form, /item\.maintenance_work_orders\?\.work_order_number/);
  assert.match(form, /Estado operacional, no verificación HSE/);
});

test('idempotent retries preserve first linking audit and report existing association', () => {
  assert.match(api, /alreadyLinked: true, data: existing.data/);
  assert.match(api, /alreadyLinked: false, data/);
  assert.match(form, /Esta OT ya estaba vinculada; no se creó un duplicado/);
});
