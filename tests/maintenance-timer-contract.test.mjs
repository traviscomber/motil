import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/timer/route.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260825033137_complete_work_order_timer_contract.sql', import.meta.url), 'utf8');

test('work-order timer route uses the authorized organization service context', () => {
  assert.match(route, /getOrganizationContext\(request\)/);
  assert.match(route, /if \(!context\.ok\) return context\.response/);
  assert.match(route, /context\.supabase\.rpc\('update_work_order_timer'/);
  assert.match(route, /p_organization_id: context\.organizationId/);
  assert.doesNotMatch(route, /createClient\(/);
});

test('work-order timer reads and history remain tenant scoped', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.from\('work_order_events'\)/);
  assert.match(route, /\.like\('event_type', 'timer_%'\)/);
});

test('timer migration provides atomic state transitions and service-role-only execution', () => {
  assert.match(migration, /add column if not exists timer_status/);
  assert.match(migration, /add column if not exists timer_start_time/);
  assert.match(migration, /add column if not exists total_timer_minutes/);
  assert.match(migration, /for update/);
  assert.match(migration, /insert into public\.work_order_events/);
  assert.match(migration, /revoke all on function public\.update_work_order_timer[\s\S]*from authenticated/);
  assert.match(migration, /grant execute on function public\.update_work_order_timer[\s\S]*to service_role/);
});


test('timer is restricted to assigned mechanic work and excludes workshop roles', () => {
  assert.match(route, /resolveMaintenanceViewerMode/);
  assert.match(route, /mode === 'workshop'/);
  assert.match(route, /El temporizador móvil no está asignado a este cargo/);
  assert.match(route, /mode !== 'execution'/);
  assert.match(route, /\.eq\('profile_id', context\.userId\)/);
  assert.match(route, /\.select\('assigned_person_id'\)/);
  assert.match(route, /Esta orden no está asignada a tu identidad operativa/);
});
