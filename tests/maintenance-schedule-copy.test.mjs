import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schedule = await readFile(new URL('../components/maintenance/maintenance-schedule.tsx', import.meta.url), 'utf8');

test('maintenance schedule renders localized priority labels', () => {
  assert.match(schedule, /low: 'Baja'/);
  assert.match(schedule, /medium: 'Media'/);
  assert.match(schedule, /high: 'Alta'/);
  assert.match(schedule, /priorityLabels\[schedule\.priority\]/);
  assert.doesNotMatch(schedule, />\{schedule\.priority\}<\/Badge>/);
});

test('maintenance schedule copy keeps Spanish accents', () => {
  assert.match(schedule, /Pendiente de programación/);
  assert.match(schedule, /días/);
});
