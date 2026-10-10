import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/close/route.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261010110000_atomic_maintenance_work_order_close.sql', import.meta.url), 'utf8');
test('close endpoint uses a single transactional RPC with no preliminary writes', () => {
 assert.match(route, /rpc\('close_work_order_atomically'/);
 assert.doesNotMatch(route, /rpc\('update_work_order_timer'/);
 assert.doesNotMatch(route, /\.update\(closureData\)/);
 assert.doesNotMatch(route, /Date\.now\(\) - startTime/);
 assert.doesNotMatch(route, /equipment_availability/);
});
test('atomic RPC preserves tenant and actor and rolls back timer on failure', () => {
 assert.match(migration, /p_actor_id is distinct from public\.current_application_user_id\(\)/);
 assert.match(migration, /organization_id = p_organization_id for update/);
 assert.match(migration, /perform public\.update_work_order_timer/);
 assert.match(migration, /return public\.close_work_order_safely\(p_work_order_id\)/);
 assert.match(migration, /revoke all on function public\.close_work_order_atomically/);
});
