import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const reliability = await fs.readFile('app/dashboard/mantenimiento/confiabilidad/page.tsx', 'utf8');
const runtime = await fs.readFile('app/dashboard/mantenimiento/horometros/page.tsx', 'utf8');
const decisions = await fs.readFile('app/dashboard/mantenimiento/decision-intelligence/page.tsx', 'utf8');
const closurePage = await fs.readFile('app/dashboard/mantenimiento/ordenes-trabajo/cierre/page.tsx', 'utf8');
const dictionaries = await fs.readFile('lib/i18n/dictionaries.ts', 'utf8');
const closureQueue = await fs.readFile('components/maintenance/progressive-work-order-close-queue.tsx', 'utf8');

test('97 reliability surface asks one decision question and never converts missing evidence to zero', () => {
  assert.match(reliability, /Qué requiere revisión de confiabilidad/);
  assert.match(reliability, /Revisar prioridad/);
  assert.match(reliability, /Sin base suficiente/);
  assert.match(reliability, /no convierte frecuencia en probabilidad de falla/);
  assert.doesNotMatch(reliability, /Number\(value \|\| 0\)/);
  assert.doesNotMatch(reliability, /xl:grid-cols-6/);
  assert.doesNotMatch(reliability, />Cerrar OT</);
});

test('97 horometer surface separates unknown readings from zero and prioritizes reconciliation', () => {
  assert.match(runtime, /Qué lectura falta para planificar con confianza/);
  assert.match(runtime, /Primero[:,] resolver evidencia pendiente/);
  assert.match(runtime, /Ausencia de lectura no equivale a cero/);
  assert.match(runtime, /Una lectura faltante se presenta como desconocida, nunca como 0/);
  assert.match(runtime, /Guardar lectura/);
  assert.doesNotMatch(runtime, />Planificación</);
  assert.doesNotMatch(runtime, />Confiabilidad</);
});

test('97 decision intelligence exposes one explicit next decision without inventing autonomy or risk probability', () => {
  assert.match(decisions, /Qué decisión necesita revisión humana ahora/);
  assert.match(decisions, /Revisar prioridad/);
  assert.match(decisions, /la IA no aprueba, ejecuta ni cierra trabajo/);
  assert.match(decisions, /no representa probabilidad de falla/);
  assert.match(decisions, /Impacto permanece sin medir/);
  assert.doesNotMatch(decisions, /risk score/i);
  assert.doesNotMatch(decisions, /predice? (?:una )?falla/i);
});

test('97 controlled closure exposes one next evidence action and preserves unknown cost', () => {
  assert.match(closurePage, /getDictionaryForRequest\(\)/);
  assert.match(dictionaries, /title: 'Qué falta para cerrar la siguiente OT'/);
  assert.match(dictionaries, /una sola acción siguiente por vez/);
  assert.match(dictionaries, /nextActionBadge: 'Siguiente acción'/);
  assert.doesNotMatch(closurePage, /Volver a órdenes/);
  assert.match(closureQueue, /lg:grid-cols-4/);
  assert.match(closureQueue, /value == null \? '—'/);
  assert.doesNotMatch(closureQueue, /lg:grid-cols-6/);
  assert.doesNotMatch(closureQueue, /RefreshCw/);
});
