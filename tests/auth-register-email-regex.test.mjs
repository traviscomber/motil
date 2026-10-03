import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registerRoute = fs.readFileSync('app/api/auth/register/route.ts', 'utf8');
const registerPage = fs.readFileSync('app/auth/register/page.tsx', 'utf8');

test('legacy public registration remains disabled instead of validating signup input', () => {
  assert.match(registerRoute, /Registro público deshabilitado/);
  assert.match(registerRoute, /status:\s*404/);
  assert.doesNotMatch(registerRoute, /emailRegex|createUser|password_hash|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(registerPage, /registration=admin_only/);
});
