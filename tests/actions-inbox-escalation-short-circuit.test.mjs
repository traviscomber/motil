import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');

test('role inbox skips escalation source when coverage proves there are none', () => {
  assert.match(source, /coverage && Number\(coverage\.escalations \|\| 0\) === 0/);
  assert.match(source, /Promise\.resolve\(\{ data: \[\], error: null \}\)/);
  assert.match(source, /const \[actionableResult, escalationResult\] = await Promise\.all/);
});

test('role inbox still queries escalations when coverage is missing or non-zero', () => {
  assert.match(source, /\.from\('role_task_escalations_v1'\)/);
  assert.match(source, /!coverageError/);
});
