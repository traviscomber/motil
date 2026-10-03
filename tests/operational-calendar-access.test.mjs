import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/api/calendar/operational/route.ts', import.meta.url), 'utf8');

test('operational calendar resolves module access before returning consolidated sources', () => {
  assert.match(source, /getUserModuleAccess/);
  assert.match(source, /isAdminRole/);
  assert.match(source, /allowedSources = new Set<CalendarSource>/);
  assert.match(source, /MODULE_KEYS\.FIN_FINANZAS/);
  assert.match(source, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(source, /MODULE_KEYS\.HSE_TABLERO/);
  assert.match(source, /MODULE_KEYS\.MANT_OPERACIONES/);
});

test('operational calendar only returns items from authorized sources', () => {
  assert.match(source, /const visibleItems = items\.filter\(\(item\) => allowedSources\.has\(item\.source\)\)/);
  assert.match(source, /data: visibleItems/);
  assert.match(source, /total: visibleItems\.length/);
  assert.doesNotMatch(source, /data: items,/);
});
