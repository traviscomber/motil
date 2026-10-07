import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const closeQueue = await readFile(new URL('../components/maintenance/progressive-work-order-close-queue.tsx', import.meta.url), 'utf8');
const closePage = await readFile(new URL('../app/dashboard/mantenimiento/ordenes-trabajo/cierre/page.tsx', import.meta.url), 'utf8');

test('closure workspace is intentionally reduced to one OT and one next action', () => {
  assert.match(closeQueue, /Siguiente paso/);
  assert.match(closeQueue, /Cerrar OT/);
  assert.match(closeQueue, /Ver OT/);
  assert.doesNotMatch(closeQueue, /Estado de cierre/);
  assert.doesNotMatch(closeQueue, /currentCost/);
});

test('closure evidence stays compact and visual', () => {
  assert.match(closeQueue, /Evidencia/);
  assert.match(closeQueue, /Agregar foto/);
  assert.match(closeQueue, /photo\.signed_url/);
  assert.match(closeQueue, /h-16 w-16/);
});

test('closure page uses a narrow operational column without descriptive chrome', () => {
  assert.match(closePage, /max-w-3xl/);
  assert.doesNotMatch(closePage, /PageHeaderDescription/);
});
