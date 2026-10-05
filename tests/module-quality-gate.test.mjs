import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const lib = await readFile(new URL('../lib/quality/module-quality.ts', import.meta.url), 'utf8');
const api = await readFile(new URL('../app/api/quality/modules/route.ts', import.meta.url), 'utf8');
const calendar = await readFile(new URL('../app/api/calendar/operational/route.ts', import.meta.url), 'utf8');

test('9.7 certification requires all quality gates to pass', () => {
  assert.match(lib, /MOTIL_QUALITY_TARGET = 9\.7/);
  assert.match(lib, /input\.gates\.every\(\(gate\) => gate\.status === 'pass'\)/);
  assert.match(lib, /blockers\.length === 0/);
});

test('quality cockpit measures canonical operation integration audit and freshness', () => {
  for (const token of ["'canonical'", "'operation'", "'integration'", "'audit'", "'freshness'"]) assert.match(api, new RegExp(token));
  assert.match(api, /No se compensa una falla operacional con UI o volumen de código/);
});

test('consolidated calendar is filtered by module permissions before response', () => {
  assert.match(calendar, /getUserModuleAccess/);
  assert.match(calendar, /allowedSources = new Set<CalendarSource>/);
  assert.match(calendar, /visibleItems = items\.filter/);
  assert.match(calendar, /data: visibleItems/);
});
