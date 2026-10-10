import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/sostenibilidad/corrective-action-card.tsx', import.meta.url), 'utf8');

test('completed and verified actions never render overdue card styling', () => {
  assert.match(source, /const isOverdue = Boolean\(dueDate\).*?!\['completed', 'verified'\]\.includes\(action\.status\)/);
  assert.match(source, /isOverdue \? 'border-red-300' : ''/);
});
