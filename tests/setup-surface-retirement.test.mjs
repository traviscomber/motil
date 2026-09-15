import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const setupPage = fs.readFileSync('app/setup/page.tsx', 'utf8');
const initPage = fs.readFileSync('app/setup/initialize-db/page.tsx', 'utf8');

test('legacy setup page is retired with a 404 boundary', () => {
  assert.match(setupPage, /notFound\(\)/);
  assert.doesNotMatch(setupPage, /auth\.users|admin|superadmin|ADMIN_INIT_TOKEN/i);
});

test('dead database initializer UI no longer exposes admin token or missing endpoint', () => {
  assert.match(initPage, /notFound\(\)/);
  assert.doesNotMatch(initPage, /ADMIN_INIT_TOKEN/i);
  assert.doesNotMatch(initPage, /\/api\/admin\/init-db/);
  assert.doesNotMatch(initPage, /Inicializar base de datos/i);
});
