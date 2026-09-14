import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260914115500_add_ai_core_error_observability.sql', import.meta.url), 'utf8');
const helper = await readFile(new URL('../lib/intelligence/core-error-observability.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/evaluation/errors/route.ts', import.meta.url), 'utf8');

test('runtime error ledger is backend-only and tenant indexed', () => {
  assert.match(migration, /motil_ai_core_errors/);
  assert.match(migration, /organization_id uuid not null/);
  assert.match(migration, /user_id uuid not null/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.motil_ai_core_errors from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.motil_ai_core_errors to service_role/);
});

test('error recorder stores safe classification but never raw prompt response or raw error detail', () => {
  assert.match(helper, /classifyCoreRuntimeError/);
  assert.match(helper, /storesPrompt: false/);
  assert.match(helper, /storesResponse: false/);
  assert.match(helper, /storesRawErrorMessage: false/);
  assert.doesNotMatch(migration, /prompt|response_content|raw_error|error_message/);
  assert.doesNotMatch(helper, /errorMessage\(input\.error\).*insert/s);
});

test('error telemetry endpoint is executive authorized tenant user scoped and read-only', () => {
  assert.match(route, /resolveExecutiveAccess/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('user_id', context\.userId\)/);
  assert.match(route, /diagnostic_observability_only/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
});
