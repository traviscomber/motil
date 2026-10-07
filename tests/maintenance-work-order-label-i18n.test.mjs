import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const helper = await readFile(new URL('../lib/maintenance/work-order-display.ts', import.meta.url), 'utf8');
const terrain = await readFile(new URL('../components/maintenance/mobile-terrain-panel.tsx', import.meta.url), 'utf8');
const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const closeQueue = await readFile(new URL('../components/maintenance/progressive-work-order-close-queue.tsx', import.meta.url), 'utf8');

test('Spanish UI renders canonical WO identifiers as OT without changing stored values', () => {
  assert.match(helper, /replace\(\/\^WO-\/i, 'OT-'\)/);
  assert.match(helper, /locale === 'en'/);
  assert.match(terrain, /formatWorkOrderNumber\(action\.workOrderNumber, locale\)/);
  assert.match(detail, /formatWorkOrderNumber\(workOrder\.work_order_number, locale\)/);
  assert.match(closeQueue, /formatWorkOrderNumber\(row\.work_order_number, locale\)/);
});
