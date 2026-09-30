import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const usersListUrl = new URL('../components/admin/users-list.tsx', import.meta.url);
const createUserUrl = new URL('../components/admin/create-user-form.tsx', import.meta.url);
const usersPageUrl = new URL('../app/dashboard/admin/users/page.tsx', import.meta.url);
const legacyImportUrl = new URL('../app/api/admin/users/import/route.ts', import.meta.url);

test('admin users preserve unavailable-source state instead of reporting zero registered users', async () => {
  const source = await readFile(usersListUrl, 'utf8');
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /No fue posible cargar los usuarios/);
  assert.match(source, /La falla de la fuente no se interpreta como una lista vacía/);
  assert.match(source, /setError\(/);
});

test('admin user deletion surfaces server failures before mutating local list', async () => {
  const source = await readFile(usersListUrl, 'utf8');
  const responseCheck = source.indexOf("if (!response.ok)");
  const localRemoval = source.indexOf('setUsers((current) => current.filter');
  assert.ok(responseCheck >= 0 && localRemoval > responseCheck);
  assert.match(source, /No fue posible completar la acción/);
});

test('user creation keeps cargo source errors distinct from no cargos', async () => {
  const source = await readFile(createUserUrl, 'utf8');
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /No fue posible cargar los cargos/);
  assert.match(source, /La falla de la fuente no se interpreta como ausencia de cargos/);
  assert.match(source, /Boolean\(cargosError\)/);
});

test('legacy bulk user import is absent from UI and closed server-side', async () => {
  const page = await readFile(usersPageUrl, 'utf8');
  const route = await readFile(legacyImportUrl, 'utf8');

  assert.doesNotMatch(page, /UsersImportXls/);
  assert.doesNotMatch(page, /Importar usuarios/);
  assert.match(route, /requireAdmin/);
  assert.match(route, /LEGACY_USER_IMPORT_DISABLED/);
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /from\('users'\)/);
  assert.doesNotMatch(route, /import_users_from_csv/);
});
