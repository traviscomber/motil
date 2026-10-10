import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/sostenibilidad/corrective-actions-page.tsx', import.meta.url), 'utf8');

test('corrective action creation requires a linked nonconformity', () => {
  assert.match(source, /disabled=\{!ncId\}/);
  assert.match(source, /<Link href="\/dashboard\/sostenibilidad\/prevencion-riesgos\/no-conformidades">Ver no conformidades<\/Link>/);
  assert.doesNotMatch(source, /agrega <code>\?ncId=/);
});
