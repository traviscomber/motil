import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const evidence = await readFile(new URL('../components/maintenance/work-order-evidence-and-approval.tsx', import.meta.url), 'utf8');

test('field OT detail hides empty evidence before completion', () => {
  assert.match(evidence, /status !== 'completed' && !evidence\.error && photos\.length === 0/);
  assert.match(evidence, /return null/);
});

test('completed OT evidence and approval fail closed instead of showing false pending state', () => {
  assert.match(evidence, /status === 'completed' && \(evidence\.isLoading \|\| review\.isLoading\)/);
  assert.match(evidence, /No se pudo cargar el cierre/);
  assert.match(evidence, /Actualiza para revisar evidencia y aprobación/);
  assert.match(evidence, /Promise\.all\(\[evidence\.mutate\(\), review\.mutate\(\)\]\)/);
});
