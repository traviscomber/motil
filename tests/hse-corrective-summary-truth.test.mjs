import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/sostenibilidad/corrective-actions-page.tsx', import.meta.url), 'utf8');

test('verified corrective actions are excluded from overdue checks', () => {
  assert.equal((source.match(/!\['completed', 'verified'\]\.includes\(a\.status\)/g) || []).length, 2);
});

test('zero counts remain zero and unavailable data is not reported as zero', () => {
  assert.match(source, /actions \? inProgressCount : '—'/);
  assert.match(source, /actions \? completedCount : '—'/);
  assert.match(source, /actions \? overDueCount : '—'/);
  assert.doesNotMatch(source, /inProgressCount \|\| statsData/);
  assert.match(source, /!actions \? '—' : totalActions/);
});
