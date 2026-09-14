import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellUrl = new URL('../components/layout/dashboard-shell.tsx', import.meta.url);
const prioritiesUrl = new URL('../components/dashboard/home-decision-priorities.tsx', import.meta.url);

const shell = await readFile(shellUrl, 'utf8');
const priorities = await readFile(prioritiesUrl, 'utf8');

test('Inicio surfaces prioritized Decision Cases without creating another module', () => {
  assert.match(shell, /pathname === '\/dashboard' \? <HomeDecisionPriorities \/>/);
  assert.match(priorities, /\/api\/intelligence\/decision-cases\/prioritized\?limit=3/);
  assert.match(priorities, /const cases = priorities\.data\?\.cases \|\| \[\]/);
});

test('home priorities remain advisory and route back to authorized operational context', () => {
  assert.match(priorities, /Advisory/);
  assert.match(priorities, /No ejecutan cambios por sí solos/);
  assert.match(priorities, /maintenance: '\/dashboard\/mantenimiento'/);
  assert.match(priorities, /geology: '\/dashboard\/produccion\/geologia'/);
  assert.match(priorities, /hse: '\/dashboard\/sostenibilidad'/);
  assert.doesNotMatch(priorities, /method:\s*'POST'/);
});
