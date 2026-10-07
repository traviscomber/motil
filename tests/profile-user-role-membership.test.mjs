import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261007203000_ensure_active_profile_user_role_membership.sql', import.meta.url),
  'utf8',
);
const workOrdersRoute = await readFile(
  new URL('../app/api/maintenance/work-orders/route.ts', import.meta.url),
  'utf8',
);

test('active application profiles are represented in tenant membership', () => {
  assert.match(migration, /insert into public\.user_roles \(user_id, organization_id, role, assigned_by\)/);
  assert.match(migration, /from public\.profiles p/);
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /p\.organization_id is not null/);
  assert.match(migration, /on conflict \(user_id, organization_id\) do nothing/);
});

test('future active profiles cannot miss the membership required by maintenance RPCs', () => {
  assert.match(migration, /create or replace function public\.ensure_active_profile_user_role_membership\(\)/);
  assert.match(migration, /after insert or update of status, organization_id, role/);
  assert.match(migration, /execute function public\.ensure_active_profile_user_role_membership\(\)/);
  assert.match(workOrdersRoute, /replace_work_order_material_requirements_v1/);
});
