import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/legal/cases/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/legal/casos/page.tsx', import.meta.url);

test('Legal case closure requires evidence and prior review at the API boundary', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /body\.status === 'closed'/);
  assert.match(source, /\['complete', 'not_required'\]\.includes\(effectiveEvidence\)/);
  assert.match(source, /No se puede cerrar un caso Legal sin evidencia completa/);
  assert.match(source, /current\.status === 'new'/);
  assert.match(source, /debe pasar por revisión Legal antes del cierre/);
});

test('Legal case API tells the UI whether the current role can write', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /accessLevel: auth\.access/);
  assert.match(source, /canWrite: auth\.access === 'ED'/);
});

test('Legal work center exposes the minimal operational workflow', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /Iniciar revisión/);
  assert.match(source, /Pedir acción/);
  assert.match(source, /Esperar área/);
  assert.match(source, /Retomar revisión/);
  assert.match(source, /Evidencia completa/);
  assert.match(source, /No requerida/);
  assert.match(source, /Cerrar caso/);
  assert.match(source, /data\.canWrite/);
});
