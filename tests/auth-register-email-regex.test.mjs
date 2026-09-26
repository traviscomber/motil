import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registerRoute = fs.readFileSync('app/api/auth/register/route.ts', 'utf8');

test('register email regex accepts real emails and rejects malformed ones', () => {
  const match = registerRoute.match(/emailRegex = \/(.+)\/\s*;/);
  assert.ok(match, 'register route must declare an emailRegex literal');
  const regex = new RegExp(match[1]);

  // A previous bug required a literal backslash in the email (escaped-dot
  // typo) and rejected every valid address, blocking all self-registration.
  for (const valid of ['supervisor@faena.cl', 'nombre.apellido@empresa.com', 'a@b.c']) {
    assert.ok(regex.test(valid), `expected ${valid} to be accepted`);
  }
  for (const invalid of ['sin-arroba', 'doble@@empresa.com', 'espacio @faena.cl', 'falta-dominio@']) {
    assert.ok(!regex.test(invalid), `expected ${invalid} to be rejected`);
  }
});
