import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const contextNavUrl = new URL('../components/layout/daily-management-context-nav.tsx', import.meta.url);
const shellUrl = new URL('../components/layout/dashboard-shell.tsx', import.meta.url);
const calendarUrl = new URL('../app/dashboard/tareas/page.tsx', import.meta.url);
const actionsUrl = new URL('../components/actions/actions-inbox.tsx', import.meta.url);
const headerUrl = new URL('../components/layout/header.tsx', import.meta.url);

test('Gestión diaria exposes three distinct unnumbered contexts', async () => {
  const source = await readFile(contextNavUrl, 'utf8');
  assert.match(source, /label: 'Revisión diaria'/);
  assert.match(source, /label: 'Acciones del cargo'/);
  assert.match(source, /label: 'Calendario operacional'/);
  assert.doesNotMatch(source, /step:/);
});

test('shared daily context is mounted once at the dashboard shell level', async () => {
  const source = await readFile(shellUrl, 'utf8');
  assert.match(source, /<DailyManagementContextNav \/>/);
});

test('calendar and cargo inbox remain semantically distinct', async () => {
  const calendar = await readFile(calendarUrl, 'utf8');
  const actions = await readFile(actionsUrl, 'utf8');
  const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

  assert.match(calendar, /PageHeaderTitle>Calendario operacional/);
  assert.match(calendar, /Compromisos abiertos con fecha/);
  assert.match(calendar, /\/api\/calendar\/operational/);
  assert.match(dict, /title: 'Mis acciones'/);
  assert.match(actions, /\/api\/actions\/inbox/);
});

test('global header uses the canonical context language', async () => {
  const header = await readFile(headerUrl, 'utf8');
  const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');
  assert.match(dict, /tareas: 'Calendario operacional'/);
  assert.match(dict, /andon: 'Problemas operacionales'/);
  assert.match(dict, /bodega: 'Bodega'/);
  assert.match(header, /aria-label=\{t\.viewCalendar\}/);
  assert.doesNotMatch(header, /aria-label="Ver acciones pendientes"/);
});
