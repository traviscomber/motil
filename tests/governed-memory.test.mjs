import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helperUrl = new URL('../lib/intelligence/governed-memory.ts', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/memory/context/route.ts', import.meta.url);

const helper = await readFile(helperUrl, 'utf8');
const route = await readFile(routeUrl, 'utf8');

test('governed memory allow-lists stable working context and blocks operational truth', () => {
  assert.match(helper, /'role'/);
  assert.match(helper, /'responsibility'/);
  assert.match(helper, /'terminology'/);
  assert.match(helper, /'preference'/);
  assert.match(helper, /'work_scope'/);
  assert.match(helper, /operational_facts/);
  assert.match(helper, /metrics/);
  assert.match(helper, /alerts/);
  assert.match(helper, /statuses/);
  assert.match(helper, /permissions/);
  assert.match(helper, /Operational truth must be resolved from current canonical evidence at decision time/);
});

test('governed memory context is tenant and user scoped, active-only and read-only', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('user_id', context\.userId\)/);
  assert.match(route, /\.eq\('active', true\)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.delete\(/);
});

test('governed memory prompt explicitly remains non-canonical', () => {
  assert.match(helper, /NO CANÓNICO/);
  assert.match(helper, /Nunca lo uses como hecho operacional/);
  assert.match(helper, /evidencia/);
  assert.match(helper, /autorización/);
});
