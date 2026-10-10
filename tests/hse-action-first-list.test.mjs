import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/page.tsx', import.meta.url), 'utf8');

test('HSE commitment list shows the actual next action', () => {
  assert.match(source, /item\.actionRequired \? <p className="mt-1 text-sm text-muted-foreground">\{item\.actionRequired\}<\/p>/);
  assert.doesNotMatch(source, /Asignar responsable<ArrowRight/);
});

test('HSE retains supporting description under details', () => {
  assert.match(source, /<summary className="min-h-11 cursor-pointer py-3">Ver detalle<\/summary>/);
  assert.match(source, /<p>\{item\.description\}<\/p>/);
});
