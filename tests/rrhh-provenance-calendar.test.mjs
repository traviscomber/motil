import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourcesApi = new URL('../app/api/rrhh/sources/route.ts', import.meta.url);
const sourcesPage = new URL('../app/dashboard/rrhh/fuentes/page.tsx', import.meta.url);
const calendarApi = new URL('../app/api/calendar/operational/route.ts', import.meta.url);
const calendarUi = new URL('../components/operational-calendar/comfortable-operational-calendar.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/rrhh/layout.tsx', import.meta.url);

test('RRHH provenance is organization scoped and access aligned with RRHH', async () => {
  const source = await readFile(sourcesApi, 'utf8');
  assert.match(source, /allowedRoles/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /source_type/);
  assert.match(source, /source_reference/);
});

test('RRHH source view preserves operational provenance without pretending it is a file', async () => {
  const source = await readFile(sourcesPage, 'utf8');
  assert.match(source, /Origen de las fichas laborales canónicas/);
  assert.match(source, /no se presenta como archivo/);
  assert.match(source, /sourceReference/);
});

test('organization calendar is ready for real credential expiry dates only', async () => {
  const source = await readFile(calendarApi, 'utf8');
  assert.match(source, /person_credentials/);
  assert.match(source, /\.not\('expires_at', 'is', null\)/);
  assert.match(source, /source: 'people'/);
  assert.match(source, /Vencimiento de credencial/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
});

test('calendar remains visible while provenance stays available outside primary RRHH navigation', async () => {
  const [calendar, layout, sources] = await Promise.all([
    readFile(calendarUi, 'utf8'),
    readFile(layoutUrl, 'utf8'),
    readFile(sourcesPage, 'utf8'),
  ]);
  assert.match(calendar, /label: 'Personas'/);
  assert.match(calendar, /summary\.by_source\.people/);
  assert.match(layout, /\/dashboard\/tareas/);
  assert.doesNotMatch(layout, /\/dashboard\/rrhh\/fuentes/);
  assert.match(sources, /Origen de las fichas laborales canónicas/);
});
