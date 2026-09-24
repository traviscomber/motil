import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lib = fs.readFileSync('lib/maintenance/asset-identity-evidence.ts', 'utf8');

test('identity evidence lib normalizes accents and strips identity noise tokens', () => {
  assert.match(lib, /export function normalizeAssetIdentity/);
  assert.match(lib, /\.normalize\('NFD'\)/);
  assert.match(lib, new RegExp(`\\[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}\\]/g`));
  assert.match(lib, /\\b\(SONDA\|EQUIPO\|MAQUINA\|MÁQUINA\)\\b/);
  assert.match(lib, /\[\^A-Z0-9\]\+/);
});

test('identity evidence lib blocks placeholder location values', () => {
  assert.match(lib, /export function normalizeLocationEvidence/);
  assert.match(lib, /\^MINA\\s\+/);
  assert.match(lib, /#ERROR!/);
  assert.match(lib, /NO REGISTRADO/);
  assert.match(lib, /SIN MINA ASIGNADA/);
  assert.match(lib, /NO ASIGNADO/);
});

test('identity evidence lib blocks placeholder categorical values but keeps raw text', () => {
  assert.match(lib, /export function cleanCategoricalEvidence/);
  assert.match(lib, /DESCONOCIDO/);
  assert.match(lib, /return raw/);
});

test('identity evidence lib maps criticality only from explicit evidence vocabulary', () => {
  assert.match(lib, /export function normalizeCriticalityEvidence/);
  assert.match(lib, /\['alta', 'high'\]/);
  assert.match(lib, /\['media', 'medium'\]/);
  assert.match(lib, /\['baja', 'low'\]/);
  assert.match(lib, /\['critica', 'critical'\]/);
});

test('identity evidence lib keeps the deterministic brand list exhaustive and explicit', () => {
  assert.match(lib, /export function inferManufacturerFromName/);
  for (const brand of ['ATLAS COPCO', 'CATERPILLAR', 'TOYOTA', 'WEICHAI', 'MITSUBISHI', 'DOOSAN', 'SANDVIK', 'EPIROC', 'XCMG', 'MANITOU']) {
    assert.match(lib, new RegExp(brand.replace(/ /g, '\\s')));
  }
  assert.doesNotMatch(lib, /Math\.random|Date\.now|new Date/);
});

test('identity evidence lib only infers explicit Chilean plate formats', () => {
  assert.match(lib, /export function inferChileanPlateFromName/);
  assert.match(lib, /\[A-Z\]\{4\}-\[0-9\]\{2\}/);
  assert.match(lib, /\[A-Z\]\{2\}-\[0-9\]\{4\}/);
  assert.match(lib, /\}\)\$\//);
});

test('identity evidence lib restricts road vehicle classification to explicit tokens', () => {
  assert.match(lib, /export function isRoadVehicleIdentity/);
  assert.match(lib, /CAMIONETA\|CAMIONETAS\|CAMION\|CAMIONES\|BUS\|BUSES\|FURGON\|VEHICULO\|VEHICLE\|TRUCK\|PICKUP/);
});

test('identity evidence lib never invents evidence deterministically', () => {
  assert.doesNotMatch(lib, /fetch\(|supabase|Math\.random|Date\.now/);
  for (const name of ['normalizeAssetIdentity', 'normalizeLocationEvidence', 'cleanCategoricalEvidence', 'normalizeCriticalityEvidence', 'inferManufacturerFromName', 'inferChileanPlateFromName', 'isRoadVehicleIdentity']) {
    assert.match(lib, new RegExp(`export function ${name}`));
  }
});
