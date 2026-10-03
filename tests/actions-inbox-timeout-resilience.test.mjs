import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const ui = await readFile(new URL('../components/actions/actions-inbox.tsx', import.meta.url), 'utf8');
const dictionaries = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('actions inbox converts statement timeout into an explicit degraded response', () => {
  assert.match(route, /error\.code === '57014'/);
  assert.match(route, /degraded:\s*true/);
  assert.match(route, /degradedReason:\s*'task_query_timeout'/);
  assert.match(route, /X-Motil-Degraded/);
  assert.doesNotMatch(route, /error\.code === '57014'[\s\S]{0,900}status:\s*500/);
});

test('degraded inbox uses coverage counts without inventing unknown metrics', () => {
  assert.match(route, /owned_tasks/);
  assert.match(route, /owned_critical/);
  assert.match(route, /support_items/);
  assert.match(route, /escalations/);
  assert.match(route, /overdue:\s*null/);
  assert.match(route, /backlog:\s*null/);
});

test('actions UI never renders all-clear state when inbox is degraded', () => {
  assert.match(ui, /inbox\.data\?\.degraded \? null : tasks\.length === 0/);
  assert.match(ui, /t\.degradedTitle/);
  assert.match(ui, /t\.degradedDescription/);
});

test('degraded inbox copy is localized in Spanish and English', () => {
  const titles = dictionaries.match(/degradedTitle:/g) ?? [];
  const descriptions = dictionaries.match(/degradedDescription:/g) ?? [];
  assert.ok(titles.length >= 2);
  assert.ok(descriptions.length >= 2);
});
