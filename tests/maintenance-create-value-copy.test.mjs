import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const create = await readFile(new URL('../components/maintenance/create-work-order.tsx', import.meta.url), 'utf8');
const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('new OT form keeps only decision-critical copy', () => {
  assert.match(dict, /title: 'Nueva OT'/);
  assert.match(dict, /description: 'Detalle \(opcional\)'/);
  assert.match(dict, /create: 'Crear OT'/);
  assert.doesNotMatch(create, /Elige primero al responsable/);
  assert.doesNotMatch(create, /Primero define quién será responsable/);
  assert.doesNotMatch(create, /Selecciona el equipo y describe el trabajo/);
  assert.doesNotMatch(create, /La OT puede crearse sin duración ni horómetro/);
  assert.doesNotMatch(create, /El responsable, equipo e insumos quedan ligados/);
});

test('new OT form avoids duplicate equipment identity and technical errors', () => {
  assert.match(create, /function assetIdentity/);
  assert.match(create, /normalize\(code\) !== normalize\(name\)/);
  assert.match(create, /assetIdentity\(asset\)/);
  assert.match(create, /function userFacingCreateError/);
  assert.doesNotMatch(create, /description=\{error\.message\}/);
  assert.doesNotMatch(create, /description=\{reviewError\.message\}/);
});
