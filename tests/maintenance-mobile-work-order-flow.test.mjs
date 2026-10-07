import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const flow = await readFile(new URL('../components/maintenance/mobile-work-order-flow.tsx', import.meta.url), 'utf8');

test('only execution maintenance profiles receive the condensed work-order workspace', () => {
  assert.match(page, /viewer\?\.mode === 'execution'/);
  assert.match(page, /if \(isExecution\)/);
  assert.match(page, /<MobileWorkOrderFlow/);
  assert.match(page, /assetName=\{workOrder\.asset_name \|\| t\.noAsset\}/);
  assert.match(page, /description=\{workOrder\.description\}/);
  assert.match(page, /assignedPersonId=\{workOrder\.assigned_person_id\}/);
  assert.doesNotMatch(page, /isExecutionMobile \? 'hidden md:block' : undefined/);
});

test('the terrain flow blocks start before a canonical person is assigned', () => {
  assert.match(flow, /hasCanonicalAssignee = Boolean\(assignedPersonId\)/);
  assert.match(flow, /Falta responsable/);
  assert.match(flow, /Asigna una persona antes de iniciar/);
  assert.match(flow, /canEdit && hasCanonicalAssignee && status !== 'completed'/);
});

test('the terrain flow preserves the start pause resume and evidence-gated close sequence', () => {
  assert.match(flow, /Iniciar trabajo/);
  assert.match(flow, /Pausar trabajo/);
  assert.match(flow, /Reanudar trabajo/);
  assert.match(flow, /Terminar y registrar evidencia/);
  assert.match(flow, /ordenes-trabajo\/cierre\?workOrderId=/);
  assert.doesNotMatch(flow, /Sigue la instrucción de la orden/);
  assert.doesNotMatch(flow, /causa, acción preventiva, horas reales y evidencia de horómetro/);
  assert.doesNotMatch(flow, /status:\s*'completed'/);
});


test('terrain execution hides technical backend failures from the operator', () => {
  assert.match(flow, /function userFacingError/);
  assert.match(flow, /uuid\|sql\|postgres\|relation\|column\|function\|rpc\|pgrst/);
  assert.match(flow, /userFacingError\(cause, 'No se pudo iniciar el trabajo\.'/);
  assert.match(flow, /userFacingError\(cause, 'No se pudo actualizar el tiempo\.'/);
  assert.match(flow, /userFacingError\(cause, 'No se pudo preparar el cierre\.'/);
});
