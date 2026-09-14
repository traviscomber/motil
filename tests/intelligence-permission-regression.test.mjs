import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const evaluator = await readFile(new URL('../lib/intelligence/permission-regression.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/evaluation/permissions/route.ts', import.meta.url), 'utf8');
const moduleAccess = await readFile(new URL('../lib/api/module-access.ts', import.meta.url), 'utf8');
const executiveAccess = await readFile(new URL('../lib/intelligence/executive-access.ts', import.meta.url), 'utf8');

test('permission semantics preserve ED LEC SR boundaries', () => {
  assert.match(evaluator, /level === 'ED' \|\| level === 'LEC'/);
  assert.match(evaluator, /canWrite: level === 'ED'/);
  assert.match(evaluator, /denied: 'SR'/);
  assert.match(moduleAccess, /const canRead = accessLevel === 'ED' \|\| accessLevel === 'LEC'/);
  assert.match(moduleAccess, /const canWrite = accessLevel === 'ED'/);
});

test('critical intelligence surfaces are mapped to existing module keys', () => {
  assert.match(evaluator, /MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(evaluator, /MODULE_KEYS\.MANT_GERENCIAL/);
  assert.match(evaluator, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(evaluator, /MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(evaluator, /MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(evaluator, /MODULE_KEYS\.FIN_FINANZAS/);
});

test('executive domain mapping stays aligned with canonical module permissions', () => {
  assert.match(executiveAccess, /production: MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(executiveAccess, /maintenance: MODULE_KEYS\.MANT_GERENCIAL/);
  assert.match(executiveAccess, /inventory: MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(executiveAccess, /procurement: MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(executiveAccess, /finance: MODULE_KEYS\.FIN_FINANZAS/);
  assert.match(evaluator, /executiveDomainAlignment/);
});

test('permission evaluation endpoint is current-user scoped and read-only', () => {
  assert.match(route, /resolveExecutiveAccess/);
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /getModuleAccessLevel\(context\.userId, access\.role, probe\.moduleKey\)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
});

test('admin bypass remains explicit and narrow', () => {
  assert.match(moduleAccess, /ADMIN_BYPASS_ROLES = new Set\(\['admin', 'superadmin', 'super_admin'\]\)/);
  assert.match(evaluator, /adminBypass: 'explicit_admin_roles_only'/);
});
