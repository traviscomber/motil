import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const queue = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');

test('work-order surfaces do not fall back to raw backend enum values', () => {
  assert.doesNotMatch(queue, /return status \|\| t\.status\.none/);
  assert.doesNotMatch(queue, /return workType \|\| t\.workType\.none/);
  assert.doesNotMatch(queue, /return priority \|\| t\.priority\.none/);
  assert.doesNotMatch(detail, /return status \|\| t\.status\.none/);
  assert.doesNotMatch(detail, /\|\| priority \|\| t\.priority\.none/);
  assert.doesNotMatch(detail, /\|\| type \|\| t\.workType\.none/);
});
