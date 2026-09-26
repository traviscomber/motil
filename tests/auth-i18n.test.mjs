import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dict = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');
const loginPage = fs.readFileSync('components/auth/login-page.tsx', 'utf8');
const registerPage = fs.readFileSync('components/auth/register-page.tsx', 'utf8');
const loginRoute = fs.readFileSync('app/auth/login/page.tsx', 'utf8');
const registerRoute = fs.readFileSync('app/auth/register/page.tsx', 'utf8');

test('auth chrome lives in the i18n dictionary for both locales', () => {
  // es default (must match the previously approved copy exactly)
  assert.match(dict, /Acceso seguro a Motil/);
  assert.match(dict, /Gestión operacional conectada y trazable/);
  assert.match(dict, /Iniciar sesión/);
  assert.match(dict, /Correo electrónico/);
  assert.match(dict, /Contraseña/);
  assert.match(dict, /Credenciales inválidas/);
  assert.match(dict, /Crear cuenta/);
  assert.match(dict, /Nombre completo/);
  assert.match(dict, /Confirmar contraseña/);
  assert.match(dict, /¿Ya tienes cuenta\?/);
  // en
  assert.match(dict, /Secure access to Motil/);
  assert.match(dict, /Sign in/);
  assert.match(dict, /Invalid credentials/);
  assert.match(dict, /Create account/);
  assert.match(dict, /Full name/);
  assert.match(dict, /Confirm password/);
  assert.match(dict, /Already have an account\?/);
});

test('auth client components receive the dictionary as a prop and hardcode no chrome', () => {
  for (const source of [loginPage, registerPage]) {
    assert.match(source, /\{ dictionary \}: \{ dictionary: Dictionary \}/);
    assert.doesNotMatch(source, /Iniciar sesión|Crear cuenta|Correo electrónico/);
  }
  assert.doesNotMatch(loginPage, /Acceso seguro a Motil/);
  assert.doesNotMatch(registerPage, /¿Ya tienes cuenta/);
});

test('auth routes resolve the request locale server-side and pass the dictionary down', () => {
  for (const route of [loginRoute, registerRoute]) {
    assert.match(route, /getDictionaryForRequest\(\)/);
    assert.match(route, /<LoginPage dictionary=\{dictionary\} \/>|<RegisterPage dictionary=\{dictionary\} \/>/);
  }
  assert.match(loginRoute, /export const dynamic = 'force-dynamic'/);
  assert.match(loginRoute, /export const revalidate = 0/);
});
