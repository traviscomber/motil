import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const closeQueue = await readFile(new URL('../components/maintenance/progressive-work-order-close-queue.tsx', import.meta.url), 'utf8');

test('closure surface exposes all pending work orders as a selectable queue', () => {
  assert.match(closeQueue, />Cierre</);
  assert.match(closeQueue, /queue\.map/);
  assert.match(closeQueue, /workOrderId=/);
  assert.doesNotMatch(closeQueue, /Seleccionada/);
  assert.match(closeQueue, /Continuar/);
});
