import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/review/route.ts', import.meta.url), 'utf8');
const ui = await readFile(new URL('../components/maintenance/work-order-evidence-and-approval.tsx', import.meta.url), 'utf8');

test('OT approval authority follows canonical cargo instead of person-name strings', () => {
  assert.match(route, /jefe de planificación/);
  assert.match(route, /jefe de equipos móviles y estacionarios/);
  assert.doesNotMatch(route, /\['Ariel López', 'Mauricio Astudillo'\]/);
  assert.match(ui, /Planificación o Jefatura de Equipos/);
});
