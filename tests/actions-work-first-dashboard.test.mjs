import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const source = await readFile(new URL('../components/actions/actions-inbox.tsx', import.meta.url), 'utf8');
test('role tasks remain the primary content, metrics and search are progressive', () => {
  assert.match(source, /<h1[^>]*>Mi trabajo<\/h1>/);
  const taskList = source.indexOf('LANE_ORDER.map');
  const extra = source.indexOf('data-testid="actions-more-details"');
  assert.ok(taskList > 0 && extra > taskList);
  assert.ok(source.indexOf('t.summary.owners', extra) > extra);
  assert.ok(source.indexOf('searchQuery', extra) > extra);
});
test('task state is not falsely represented as completed', () => {
  assert.match(source, /status: 'pending' \| 'read' \| 'snoozed'/);
  assert.match(source, /task\.module_route/);
  assert.match(source, /inbox\.data\?\.degraded/);
});
