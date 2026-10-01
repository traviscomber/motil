import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('lib/maintenance/viewer-mode.ts', 'utf8');

test('Ariel and Mauricio share the planning dashboard mode', () => {
  assert.match(source, /jefe de planificación'\) return 'planning'/);
  assert.match(source, /jefe de equipos móviles y estacionarios'\) return 'planning'/);
});

test('department maintenance leadership remains leadership', () => {
  assert.match(source, /jefe departamento de mantenimiento'\) return 'leadership'/);
});
