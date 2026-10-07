import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const queue = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');

test('Spanish work-order queue formats canonical numbers for display and search', () => {
  assert.match(queue, /formatWorkOrderNumber/);
  assert.match(queue, /formatWorkOrderNumber\(order\.work_order_number, locale\)/);
  assert.match(queue, /order\.work_order_number, formatWorkOrderNumber\(order\.work_order_number, locale\)/);
});
