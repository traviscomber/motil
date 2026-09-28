import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/availability/summary/route.ts', 'utf8');
const ui = fs.readFileSync('components/maintenance/availability-semaphore.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/disponibilidad/page.tsx', 'utf8');
const dictionaries = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');

test('availability uses canonical assets instead of cost centers as fleet truth', () => {
  assert.match(api, /canonical_assets_current/);
  assert.doesNotMatch(api, /from\('cost_centers'\)/);
  assert.match(api, /MODULE_KEYS\.MANT_OPERACIONES/);
});

test('availability refuses to publish an unsupported percentage', () => {
  assert.match(api, /availabilityPercentage:\s*null/);
  assert.match(api, /insufficient_operating_window/);
  assert.match(api, /ventana operativa comparable/i);
  assert.doesNotMatch(api, /availability\s*>=\s*80/);
});

test('availability UI explains evidence gaps and links priority assets to 360', () => {
  assert.match(ui, /Porcentaje aún no calculable/);
  assert.match(ui, /No es un ranking de impacto productivo/);
  assert.match(ui, /Ficha 360/);
  assert.doesNotMatch(ui, /Disponibilidad en Tiempo Real/);
  assert.doesNotMatch(ui, /por debajo del 70/);
  assert.match(page, /getDictionaryForRequest\(\)/);
  assert.match(dictionaries, /cost centers no se interpretan como equipos/i);
});
