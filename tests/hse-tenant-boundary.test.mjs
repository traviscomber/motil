import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260914160000_add_tenant_safe_hse_incident_risk_mapping.sql', 'utf8');

test('legacy incidents require an explicit tenant mapping before canonical exposure', () => {
  assert.match(migration, /motil_hse_incident_tenant_links/);
  assert.match(migration, /incident_id uuid primary key references public\.incidents\(id\)/);
  assert.match(migration, /organization_id uuid not null references public\.organizations\(id\)/);
  assert.match(migration, /canonical_hse_incidents_v1/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /No row is mapped automatically/);
});

test('legacy risks require an explicit tenant mapping before canonical exposure', () => {
  assert.match(migration, /motil_hse_risk_tenant_links/);
  assert.match(migration, /risk_id uuid primary key references public\.risk_matrix\(id\)/);
  assert.match(migration, /organization_id uuid not null references public\.organizations\(id\)/);
  assert.match(migration, /canonical_hse_risks_v1/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /No row is mapped automatically/);
});

test('tenant mapping tables and canonical views remain backend only', () => {
  for (const object of [
    'motil_hse_incident_tenant_links',
    'motil_hse_risk_tenant_links',
    'canonical_hse_incidents_v1',
    'canonical_hse_risks_v1',
  ]) {
    assert.match(migration, new RegExp(`revoke all on (?:table )?public\\.${object} from anon, authenticated`));
    assert.match(migration, new RegExp(`grant (?:select, insert, update, delete|select) on (?:table )?public\\.${object} to service_role`));
  }
});

test('migration never auto-backfills legacy HSE rows', () => {
  assert.doesNotMatch(migration, /insert\s+into\s+public\.motil_hse_(?:incident|risk)_tenant_links/i);
  assert.doesNotMatch(migration, /update\s+public\.(?:incidents|risk_matrix)/i);
});
