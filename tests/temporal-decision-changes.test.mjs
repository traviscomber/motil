import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const helper = fs.readFileSync('lib/intelligence/temporal-decision-changes.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/decision-cases/changes/route.ts', 'utf8');

test('temporal intelligence derives only explicit case lifecycle events', () => {
  assert.match(helper, /'appeared' \| 'acknowledged' \| 'revalidated' \| 'resolved' \| 'changed'/);
  assert.match(helper, /created_at/);
  assert.match(helper, /acknowledged_at/);
  assert.match(helper, /last_revalidated_at/);
  assert.match(helper, /status === 'resolved'/);
  assert.match(helper, /do not infer root cause, severity or business impact/);
});

test('changes endpoint is user organization and permission scoped', () => {
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(route, /filterAccessibleDecisionCaseDomains/);
});

test('changes endpoint is read only and bounded', () => {
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /MAX_WINDOW_DAYS = 30/);
  assert.match(route, /\.limit\(200\)/);
  assert.match(route, /operationalMutationExecuted: false/);
});
