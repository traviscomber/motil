import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const dictionaries = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('work order assignment stores canonical person identity and derives the display name', () => {
  assert.match(route, /assigned_person_id\?: string \| null/);
  assert.match(route, /from\('people'\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /eq\('employment_status', 'active'\)/);
  assert.match(route, /not\('profile_id', 'is', null\)/);
  assert.match(route, /updateData\.assigned_person_id = assignee\.id/);
  assert.match(route, /updateData\.assigned_to_name = assignee\.full_name/);
  assert.doesNotMatch(route, /if \(body\.assigned_to_name !== undefined\)/);
});

test('work order detail exposes only linked active people as assignee choices', () => {
  assert.match(route, /const \[asset, costSummary, costCenters, assignees, closeReadiness\]/);
  assert.match(route, /costCenters, assignees, closeReadiness/);
  assert.match(page, /const assignees = data\?\.assignees \|\| \[\]/);
  assert.match(page, /id="assignee"/);
  assert.match(page, /patchOrder\(\{\s*assigned_person_id:\s*event\.target\.value \|\| null\s*\}\)/);
  assert.match(dictionaries, /pending: 'Debe asignarse una persona operativa antes de iniciar\.'/);
});

test('desktop start is blocked until canonical responsibility exists', () => {
  assert.match(page, /disabled=\{!canEdit \|\| !workOrder\.assigned_person_id\}/);
});
