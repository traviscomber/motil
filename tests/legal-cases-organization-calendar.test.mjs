import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const calendarApi = new URL('../app/api/calendar/operational/route.ts', import.meta.url);

test('organization calendar includes dated Legal cases from deterministic referrals', async () => {
  const source = await readFile(calendarApi, 'utf8');
  assert.match(source, /from\('legal_cases'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.not\('due_at', 'is', null\)/);
  assert.match(source, /source: 'legal'/);
  assert.match(source, /Revisión contractual/);
  assert.match(source, /Vencimiento contractual/);
  assert.match(source, /\/dashboard\/legal\/casos/);
});

test('calendar does not duplicate Legal cases already sourced from compliance events', async () => {
  const source = await readFile(calendarApi, 'utf8');
  assert.match(source, /row\.source_type === 'compliance_event'/);
  assert.match(source, /continue/);
});

test('Legal workflow states render with operational Spanish labels', async () => {
  const source = await readFile(calendarApi, 'utf8');
  assert.match(source, /new: 'Nuevo'/);
  assert.match(source, /in_review: 'En revisión'/);
  assert.match(source, /action_required: 'Acción requerida'/);
  assert.match(source, /waiting_area: 'Esperando área'/);
});
