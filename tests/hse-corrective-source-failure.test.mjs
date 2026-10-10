import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const api = readFileSync(new URL('../app/api/sostenibilidad/corrective-actions/route.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../components/sostenibilidad/corrective-actions-page.tsx', import.meta.url), 'utf8');

test('GET returns an explicit error on data failure', () => {
  assert.match(api, /GET failed:/);
  assert.match(api, /error: 'No se pudieron cargar las acciones correctivas' \}, \{ status: 500 \}/);
});

test('the client distinguishes source failure from an empty action list', () => {
  assert.match(page, /if \(!response\.ok\) throw new Error/);
  assert.match(page, /error: actionsError, isLoading: actionsLoading/);
  assert.match(page, /Acciones correctivas no disponibles/);
  assert.match(page, /!actionsError && !actionsLoading \? <Tabs/);
});
