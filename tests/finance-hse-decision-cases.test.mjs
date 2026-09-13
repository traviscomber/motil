import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/decision-cases/sync-finance-hse/route.ts', import.meta.url);
const accessUrl = new URL('../lib/intelligence/decision-case-access.ts', import.meta.url);
const syncUiUrl = new URL('../components/dashboard/operational-decision-sync.tsx', import.meta.url);

const route = await readFile(routeUrl, 'utf8');
const access = await readFile(accessUrl, 'utf8');
const syncUi = await readFile(syncUiUrl, 'utf8');

test('finance cases require finance and maintenance access before exposing OT evidence', () => {
  assert.match(route, /financeAllowed && maintenanceAllowed \? financeCandidates/);
  assert.match(route, /from\('maintenance_work_orders'\)/);
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.match(route, /\.is\('cost_center_id', null\)/);
});

test('HSE cases remain tenant scoped and do not invent overdue status without due date', () => {
  assert.match(route, /from\('hse_commitments'\)/);
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.match(route, /\.is\('due_date', null\)/);
  assert.match(route, /no los clasifica como vencidos/);
  assert.match(route, /no es posible calcular atraso, urgencia temporal ni incumplimiento/);
});

test('finance and HSE sync remains advisory only', () => {
  assert.match(route, /authority: 'advisory_only'/);
  assert.doesNotMatch(route, /from\('maintenance_work_orders'\)\s*\.update/);
  assert.doesNotMatch(route, /from\('hse_commitments'\)\s*\.update/);
  assert.match(route, /no asigna centros de costo, no modifica compromisos HSE/);
});

test('HSE decision access is explicitly permissioned through HSE tablero', () => {
  assert.match(access, /\| 'hse'/);
  assert.match(access, /hse: MODULE_KEYS\.HSE_TABLERO/);
});

test('decision center revalidates finance and HSE alongside the core domains', () => {
  assert.match(syncUi, /decision-cases\/sync-finance-hse/);
  assert.match(syncUi, /Mantención, Geología, Inventario, Compras, Producción, Finanzas y HSE/);
});
