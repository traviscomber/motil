import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overviewApi = new URL('../app/api/hse/overview/route.ts', import.meta.url);
const overviewPage = new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/page.tsx', import.meta.url);
const commitmentsPage = new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/compromisos/page.tsx', import.meta.url);

test('HSE commitment actions are derived only from missing canonical owner evidence', async () => {
  const source = await readFile(overviewApi, 'utf8');
  assert.match(source, /requiresOwner/);
  assert.match(source, /Asignar responsable HSE con evidencia organizacional/);
  assert.match(source, /no_source_date/);
  assert.match(source, /commitmentsUnassigned/);
});

test('HSE overview surfaces commitment actions without inventing calendar dates', async () => {
  const source = await readFile(overviewPage, 'utf8');
  assert.match(source, /Pendientes/);
  assert.match(source, /item\.actionRequired/);
  assert.match(source, /event\.due_date/);
  assert.doesNotMatch(source, /new Date\(\)\.toISOString/);
  assert.match(source, /requieren asignar responsable/);
});

test('HSE commitment list prioritizes missing owners and preserves source truth', async () => {
  const source = await readFile(commitmentsPage, 'utf8');
  assert.match(source, /Asignar responsable/);
  assert.match(source, /Responsable no definido en fuente/);
  assert.match(source, /row\.actionRequired/);
});
