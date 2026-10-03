import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const proxy = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');
const registerRoute = await readFile(new URL('../app/api/auth/register/route.ts', import.meta.url), 'utf8');
const registerPage = await readFile(new URL('../app/auth/register/page.tsx', import.meta.url), 'utf8');

test('public registration API is not allowlisted', () => {
  assert.doesNotMatch(proxy, /'\/api\/auth\/register'/);
});

test('legacy registration endpoint is disabled', () => {
  assert.match(registerRoute, /Registro público deshabilitado/);
  assert.match(registerRoute, /status:\s*404/);
  assert.doesNotMatch(registerRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(registerRoute, /password_hash/);
});

test('public registration page redirects to login', () => {
  assert.match(registerPage, /redirect\('\/auth\/login\?registration=admin_only'\)/);
});
