import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/operational-board/route.ts', import.meta.url), 'utf8');
const board = await readFile(new URL('../components/maintenance/operational-work-order-board.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');

test('supervisor OT board is limited to planning and maintenance leadership roles', () => {
  assert.match(route, /mode !== 'planning' && mode !== 'leadership'/);
  assert.match(route, /maintenance_work_orders/);
  assert.match(route, /work_order_events/);
  assert.match(route, /work_order_supervisor_reviews/);
  assert.match(route, /maintenance_canonical_assets_v1/);
});

test('board makes live state, owner, timer and pause comment visible in one row', () => {
  assert.match(board, /Pausada/);
  assert.match(board, /En curso/);
  assert.match(board, /Por aprobar/);
  assert.match(board, /lastPauseComment/);
  assert.match(board, /assignedToName/);
  assert.match(board, /totalTimerSeconds/);
  assert.match(board, /timerStartTime/);
  assert.match(board, /Revisar pausa/);
  assert.match(board, /Revisar y aprobar/);
});

test('planning and leadership see the operational board before secondary maintenance content', () => {
  assert.match(home, /mode === 'planning' \|\| mode === 'leadership'/);
  assert.match(home, /<OperationalWorkOrderBoard locale=\{locale\} \/>/);
});
