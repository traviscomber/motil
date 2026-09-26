import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../components/calendar/operational-calendar.tsx', import.meta.url);
const dictUrl = new URL('../lib/i18n/dictionaries.ts', import.meta.url);

test('operational calendar keeps unavailable summary distinct from zero', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const dict = await readFile(dictUrl, 'utf8');

  assert.match(page, /const summary = data\?\.summary \?\? null/);
  assert.match(page, /isLoading \|\| error \|\| \!summary \? '—'/);
  assert.match(page, /summaryValue\('total'\)/);
  assert.match(dict, /Los conteos permanecen sin dato hasta recuperar la fuente/);
  assert.doesNotMatch(page, /\{ overdue: 0, today: 0, next_7_days: 0, total: 0 \}/);
});
