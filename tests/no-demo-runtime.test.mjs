import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_ROOTS = ['app', 'components', 'hooks', 'lib'];
const FORBIDDEN_PATH_SEGMENT = /(^|\/)(demo|mock)(\/|$)/i;
const FORBIDDEN_RUNTIME_TOKEN = /\b(demo|mock)\b/i;

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('runtime surface contains no demo or mock routes, modules, or copy', () => {
  const files = RUNTIME_ROOTS.flatMap(walk)
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

  const badPaths = files.filter((file) => FORBIDDEN_PATH_SEGMENT.test(file.replaceAll('\\', '/')));
  assert.deepEqual(badPaths, []);

  const badContent = files
    .filter((file) => FORBIDDEN_RUNTIME_TOKEN.test(fs.readFileSync(file, 'utf8')))
    .map((file) => file.replaceAll('\\', '/'));

  assert.deepEqual(badContent, []);
});
