import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/decision-cases/sync-hse/route.ts', import.meta.url);
const accessUrl = new URL('../lib/intelligence/decision-case-access.ts', import.meta.url);
const syncUiUrl = new URL('../components/dashboard/operational-decision-sync.tsx', import.meta.url);

const route = await readFile(routeUrl, 'utf8');
const access = await readFile(accessUrl, 'utf8');
const syncUi = await readFile(syncUiUrl, 'utf8');

test('HSE cases use only tenant-scoped commitments', () => {
  assert.match(route, /from\('hse_commitments'\)/);
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.doesNotMatch(route, /from\('hse_alerts'\)/);
  assert.doesNotMatch(route, /from\('incidents'\)/);
  assert.doesNotMatch(route, /from\('risk_matrix'\)/);
});

test('HSE governance case never invents overdue status without due date', () => {
  assert.match(route, /\.is\('due_date', null\)/);
  assert.match(route, /no los clasifica como vencidos/);
  assert.match(route, /no es posible calcular atraso, urgencia temporal ni incumplimiento/);
  assert.match(route, /no infiere vencimiento, urgencia o incumplimiento cuando due_date está ausente/);
});

test('HSE decision sync remains advisory and read only', () => {
  assert.match(route, /authority: 'advisory_only'/);
  assert.doesNotMatch(route, /from\('hse_commitments'\)\s*\.update/);
  assert.match(route, /target_domain: 'hse'/);
});

test('HSE decision domain is permissioned through HSE tablero', () => {
  assert.match(access, /\| 'hse'/);
  assert.match(access, /hse: MODULE_KEYS\.HSE_TABLERO/);
});

test('decision center includes HSE in human revalidation', () => {
  assert.match(syncUi, /decision-cases\/sync-hse/);
  assert.match(syncUi, /Producción, Finanzas y HSE/);
});
