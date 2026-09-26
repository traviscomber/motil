import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../components/dashboard/dashboard-home.tsx', import.meta.url);
const dictUrl = new URL('../lib/i18n/dictionaries.ts', import.meta.url);

test('dashboard never turns an unavailable role inbox into zero work or an empty-action claim', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const dict = await readFile(dictUrl, 'utf8');

  assert.match(page, /const roleValue = \(key: keyof InboxSummary\)/);
  assert.match(page, /summary \? summary\[key\] : '—'/);
  assert.match(page, /const inboxUnavailable = Boolean\(inbox\.error\)/);
  assert.match(dict, /Trabajo del cargo no disponible/);
  assert.match(dict, /No se puede afirmar que no haya acciones pendientes/);
  assert.match(dict, /Fuente de acciones no disponible/);
  assert.doesNotMatch(page, /value: summary\?\.critical \?\? 0/);
  assert.doesNotMatch(page, /value: summary\?\.owners \?\? 0/);
});
