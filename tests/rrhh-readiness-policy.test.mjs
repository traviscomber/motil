import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261005170500_rrhh_faena_readiness_policy.sql', import.meta.url), 'utf8');
const store = await readFile(new URL('../lib/rrhh-readiness-policy-store.ts', import.meta.url), 'utf8');
const lib = await readFile(new URL('../lib/rrhh-readiness.ts', import.meta.url), 'utf8');
const api = await readFile(new URL('../app/api/rrhh/readiness-policies/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/rrhh/requisitos/page.tsx', import.meta.url), 'utf8');

test('faena policy schema is tenant scoped and closed to direct authenticated writes', () => {
  assert.match(migration, /organization_id uuid not null references public\.organizations/);
  assert.match(migration, /requirement_type in \('credential', 'competency', 'epp'\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.rrhh_faena_readiness_policies from anon, authenticated/);
  assert.match(migration, /where status = 'active'/);
});

test('policy loader fails conservatively when storage is absent or unavailable', () => {
  assert.match(store, /available: false/);
  assert.match(store, /policies: \[\]/);
  assert.match(store, /error: String/);
});

test('readiness selects role policy before site fallback and requires non-empty requirements', () => {
  assert.match(lib, /candidates\.find\(\(policy\) => normalized\(policy\.role_title\)/);
  assert.match(lib, /candidates\.find\(\(policy\) => !normalized\(policy\.role_title\)\)/);
  assert.match(lib, /requirements\.length === 0/);
  assert.match(lib, /Falta credencial vigente/);
  assert.match(lib, /Falta competencia vigente/);
  assert.match(lib, /Falta EPP vigente/);
});

test('policy API and workspace never seed inferred requirements', () => {
  assert.match(api, /La política debe tener al menos un requisito explícito/);
  assert.match(api, /status: 'active'/);
  assert.doesNotMatch(api, /infer|autofill|seed/i);
  assert.match(page, /Define sólo exigencias formalmente conocidas/);
  assert.match(page, /Una política vacía o inexistente nunca convierte una persona en APTO/);
});
