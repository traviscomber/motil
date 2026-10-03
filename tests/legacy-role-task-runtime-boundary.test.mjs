import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RUNTIME_ROOTS = ['app', 'components', 'lib'];
const LEGACY_SOURCES = [
  'role_task_frontend_v1',
  'role_task_frontend_summary_v1',
  'role_task_worklist_v1',
  'role_task_worklist_summary_v1',
  'role_task_actions_available_v1',
  'role_task_operational_lanes_v1',
  'role_task_personal_inbox_v1',
];

async function collectFiles(root) {
  const output = [];
  async function walk(path) {
    const info = await stat(path);
    if (info.isDirectory()) {
      const entries = await readdir(path);
      for (const entry of entries) await walk(join(path, entry));
      return;
    }
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) output.push(path);
  }
  await walk(root);
  return output;
}

test('runtime code does not reintroduce monolithic role-task views', async () => {
  const offenders = [];
  for (const root of RUNTIME_ROOTS) {
    for (const file of await collectFiles(root)) {
      const source = await readFile(file, 'utf8');
      for (const legacy of LEGACY_SOURCES) {
        if (source.includes(legacy)) offenders.push(`${file}: ${legacy}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Legacy role-task views are compatibility/diagnostic only. Use scoped canonical sources instead:\n${offenders.join('\n')}`,
  );
});
