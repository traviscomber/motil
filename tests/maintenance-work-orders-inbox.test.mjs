import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queue = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');

test('maintenance work orders render as an inbox-style clickable list', () => {
  assert.match(queue, /Bandeja de órdenes/);
  assert.match(queue, /href=\{\`\/dashboard\/mantenimiento\/ordenes-trabajo\/\$\{order\.id\}\`\}/);
  assert.match(queue, /Estado<\/span>/);
  assert.match(queue, /Orden<\/span>/);
  assert.match(queue, /Equipo<\/span>/);
  assert.match(queue, /Responsable<\/span>/);
  assert.match(queue, /Ver cierre/);
  assert.match(queue, /Continuar/);
});

test('maintenance agenda stays secondary to the inbox', () => {
  assert.match(queue, /<details className="rounded-lg border bg-card">/);
  assert.match(queue, /Ver agenda próxima/);
  assert.doesNotMatch(queue, /onMarkComplete=\{markScheduleComplete\}/);
});
