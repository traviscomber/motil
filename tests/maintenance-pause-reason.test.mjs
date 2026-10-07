import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/timer/route.ts', import.meta.url), 'utf8');
const mobile = await readFile(new URL('../components/maintenance/mobile-work-order-flow.tsx', import.meta.url), 'utf8');
const desktop = await readFile(new URL('../components/maintenance/work-order-timer.tsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261005203500_require_work_order_pause_reason.sql', import.meta.url), 'utf8');

test('pause API requires a non-empty reason before calling the timer RPC', () => {
  assert.match(route, /action === 'pause' && !notes/);
  assert.match(route, /Debes indicar por qué pausas la orden de trabajo/);
  assert.match(route, /p_notes: notes/);
});

test('terrain execution asks for a pause reason and keeps the reason visible while paused', () => {
  assert.match(mobile, /Entró una OT más crítica/);
  assert.match(mobile, /Motivo de pausa/);
  assert.match(mobile, /Selecciona un motivo/);
  assert.match(mobile, /Confirmar pausa/);
  assert.match(mobile, /Motivo de la pausa/);
  assert.match(mobile, /timerAction\('pause', notes\)/);
});

test('desktop work-order timer follows the same pause-reason contract', () => {
  assert.match(desktop, /Entró una OT más crítica/);
  assert.match(desktop, /Motivo de la pausa/);
  assert.match(desktop, /Confirmar pausa/);
  assert.match(desktop, /handleAction\('pause', notes\)/);
});

test('database timer function rejects reasonless pauses and audits the supplied reason', () => {
  assert.match(migration, /p_action = 'pause' and v_pause_reason is null/);
  assert.match(migration, /raise exception 'Debes indicar por qué pausas la orden de trabajo\.'/);
  assert.match(migration, /v_summary := 'Trabajo pausado: ' \|\| v_pause_reason/);
  assert.match(migration, /'notes', v_pause_reason/);
  assert.match(migration, /v_elapsed_seconds := greatest/);
  assert.match(migration, /v_new_start := null/);
  assert.match(migration, /grant execute on function public\.update_work_order_timer[\s\S]*to service_role/);
});
