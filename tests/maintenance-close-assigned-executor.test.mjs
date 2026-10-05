import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261005202500_close_work_order_assigned_executor.sql', import.meta.url), 'utf8');
const closeUi = await readFile(new URL('../components/maintenance/progressive-work-order-close-queue.tsx', import.meta.url), 'utf8');

test('safe close authorizes current model and assigned executor without legacy user_roles dependency', () => {
  assert.match(migration, /public\.profiles/);
  assert.match(migration, /public\.role_matrix/);
  assert.match(migration, /public\.people/);
  assert.match(migration, /pe\.id = v_wo\.assigned_person_id/);
  assert.match(migration, /pe\.profile_id = v_actor/);
});

test('closure UI visibly confirms uploaded photo evidence', () => {
  assert.match(closeUi, /Fotos cargadas/);
  assert.match(closeUi, /item\.file_name/);
  assert.match(closeUi, /foto\$\{evidenceCount === 1/);
});
