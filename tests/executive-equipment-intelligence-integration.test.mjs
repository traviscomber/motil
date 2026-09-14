import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url), 'utf8');

test('executive core resolves explicit equipment only when maintenance is authorized', () => {
  assert.match(route, /if \(access\.canRead\('maintenance'\)\)/);
  assert.match(route, /resolveEquipmentMention\(context, message\)/);
  assert.match(route, /loadEquipmentIntelligenceContext\(context, String\(equipment\.id\)\)/);
});

test('equipment intelligence is injected as canonical evidence rather than non-canonical context', () => {
  assert.match(route, /evidence\.equipment = \{/);
  assert.match(route, /asset: loadedEquipment\.asset/);
  assert.match(route, /operational: loadedEquipment\.operational/);
  assert.match(route, /decisionCases: loadedEquipment\.decisionCases/);
  assert.match(route, /EVIDENCIA MOTIL CANÓNICA\/AUTORIZADA/);
});

test('equipment semantics preserve evidence boundaries', () => {
  assert.match(route, /Separa horómetro\/runtime de MTBF\/MTTR/);
  assert.match(route, /work_order_parts no prueba stock disponible/);
  assert.match(route, /evidencia no disponible, no cero/);
  assert.match(route, /recurrencia observada no es predicción de falla/);
});

test('executive response exposes equipment resolution metadata and remains read-only', () => {
  assert.match(route, /equipmentContext:/);
  assert.match(route, /read_equipment_intelligence/);
  assert.match(route, /READ_ONLY \+ permission-aware/);
  assert.doesNotMatch(route, /evidence\.equipment\s*=.*insert/s);
});
