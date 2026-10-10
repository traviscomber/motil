import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/dashboard/legal/sernageomin/page.tsx', import.meta.url), 'utf8');

test('regulatory methodology is optional rather than blocking the obligations queue', () => {
  assert.match(source, /<details className="rounded-md border" aria-label="Metodología e indicadores regulatorios">/);
  assert.match(source, /Ver metodología e indicadores/);
  assert.ok(source.indexOf('Ver metodología e indicadores') < source.indexOf('data.obligations.map'));
});

test('official evidence and applicability remain visible per obligation on demand', () => {
  assert.match(source, /Evidencia y aplicabilidad/);
  assert.match(source, /item\.sourceUrl/);
  assert.match(source, /item\.businessOwner/);
  assert.match(source, /item\.nextAction/);
});
