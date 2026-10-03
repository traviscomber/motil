import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/api/calendar/operational/route.ts', import.meta.url), 'utf8');

test('operational calendar sources overdue hour-based maintenance from canonical status view', () => {
  assert.match(source, /\.from\('preventive_maintenance_hour_status_v1'\)/);
  assert.match(source, /\.eq\('alert_due', true\)/);
  assert.match(source, /\.is\('generated_work_order_id', null\)/);
  assert.match(source, /row\.hour_status !== 'overdue'/);
  assert.match(source, /meter_evidence_source === 'runtime_reading'/);
});

test('overdue hour-based maintenance opens the focused preventive-hours workflow', () => {
  assert.match(source, /dashboard\/mantenimiento\/preventivo-horas\?assetId=/);
  assert.match(source, /dueMeter=/);
  assert.match(source, /Vencido por horómetro/);
});
