import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260914173500_harden_hse_role_task_resolution.sql', import.meta.url),
  'utf8',
);

test('authenticated resolver requires current organization and cargo ownership', () => {
  assert.match(migration, /t\.organization_id = v_org/);
  assert.match(migration, /t\.cargo_id = v_cargo/);
  assert.match(migration, /t\.task_key = p_task_key/);
  assert.match(migration, /t\.responsibility = 'owner'/);
});

test('every HSE mutation path requires canonical tenant mapping', () => {
  assert.match(migration, /canonical_hse_incidents_v1[\s\S]*i\.organization_id = v_org/);
  assert.match(migration, /canonical_hse_inspections_v1[\s\S]*i\.organization_id = v_org/);
  assert.match(migration, /canonical_hse_risks_v1[\s\S]*r\.organization_id = v_org/);
  assert.match(migration, /incident_not_tenant_mapped/);
  assert.match(migration, /inspection_not_tenant_mapped/);
  assert.match(migration, /risk_not_tenant_mapped/);
});

test('legacy implementation is not executable by authenticated clients', () => {
  assert.match(
    migration,
    /revoke all on function public\.resolve_role_task_legacy_unscoped\(text, text, text, uuid, date\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.resolve_role_task_legacy_unscoped\(text, text, text, uuid, date\)[\s\S]*to service_role/,
  );
});

test('public resolver keeps authenticated API contract without exposing anonymous execution', () => {
  assert.match(
    migration,
    /revoke all on function public\.resolve_role_task\(text, text, text, uuid, date\)[\s\S]*from public, anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.resolve_role_task\(text, text, text, uuid, date\)[\s\S]*to authenticated, service_role/,
  );
});
