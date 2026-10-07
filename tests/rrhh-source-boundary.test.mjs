import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/rrhh/page.tsx', import.meta.url);
const detailUrl = new URL('../app/dashboard/rrhh/personas/[id]/page.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/rrhh/layout.tsx', import.meta.url);
const apiUrl = new URL('../app/api/rrhh/people/route.ts', import.meta.url);

test('RRHH keeps unavailable counts distinct from zero and surfaces only real reconciliation work', async () => {
  const [page, api] = await Promise.all([
    readFile(pageUrl, 'utf8'),
    readFile(apiUrl, 'utf8'),
  ]);

  assert.match(page, /const countsUnavailable = loading \|\| Boolean\(error\)/);
  assert.match(page, /countsUnavailable \? '—' : value/);
  assert.match(page, /withoutProfile > 0/);
  assert.match(page, /withoutRole > 0/);
  assert.match(page, /Los conteos permanecen sin dato hasta recuperar la fuente/);
  assert.match(api, /row\.status === 'finalized'/);
  assert.match(api, /latestScore: latest\?\.overall_score \?\? null/);
});

test('RRHH stage one keeps navigation and person detail intentionally simple', async () => {
  const [layout, detail] = await Promise.all([
    readFile(layoutUrl, 'utf8'),
    readFile(detailUrl, 'utf8'),
  ]);

  assert.match(layout, /label: 'Personas'/);
  assert.match(layout, /label: 'Calendario'/);
  assert.doesNotMatch(layout, /label: 'Capacidad operacional'/);
  assert.doesNotMatch(layout, /label: 'Fuentes'/);

  assert.match(detail, /Datos de la persona/);
  assert.match(detail, /Asignación actual/);
  assert.match(detail, /Actividad operacional/);
  assert.match(detail, /hasRequirements \?/);
  assert.match(detail, /hasHistory \?/);
  assert.match(detail, /La ficha muestra sólo información disponible/);
});

test('RRHH stage one supports simple create and edit without weakening tenant scope', async () => {
  const [page, detail, api] = await Promise.all([
    readFile(pageUrl, 'utf8'),
    readFile(detailUrl, 'utf8'),
    readFile(apiUrl, 'utf8'),
  ]);

  assert.match(page, /Nueva persona/);
  assert.match(page, /method: 'POST'/);
  assert.match(detail, /onClick={openEdit}/);
  assert.match(detail, /Editar/);
  assert.match(detail, /method: 'PATCH'/);

  assert.match(api, /export async function POST/);
  assert.match(api, /export async function PATCH/);
  assert.match(api, /source_type: 'manual'/);
  assert.match(api, /source_reference: 'RRHH MOTIL'/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /Ya existe una persona con ese/);
  assert.doesNotMatch(api, /export async function DELETE/);
});
