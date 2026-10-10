import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile('app/dashboard/bodega/page.tsx', 'utf8');
test('bodega keeps critical diesel conflicts visible before stock list', () => {
  assert.ok(source.indexOf('Estado de petróleo diésel') < source.indexOf('>Existencias</h2>'));
  assert.ok(source.indexOf('Qué requiere atención hoy') < source.indexOf('>Existencias</h2>'));
  assert.match(source, /diesel\.hasConflict/);
});
test('inventory indicators are secondary without removing search or permissions', () => {
  assert.ok(source.indexOf('>Existencias</h2>') < source.indexOf('data-testid="bodega-more-indicators"'));
  assert.match(source, /Ver más · Indicadores de inventario/);
  assert.match(source, /canEdit\('bodega_inventario'\)/);
  assert.match(source, /setQuery/);
  assert.match(source, /setStatus/);
});
