import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const overview = fs.readFileSync('app/dashboard/legal/page.tsx', 'utf8');
const casesPage = fs.readFileSync('app/dashboard/legal/casos/page.tsx', 'utf8');
const casesApi = fs.readFileSync('app/api/legal/cases/route.ts', 'utf8');
const layout = fs.readFileSync('app/dashboard/legal/layout.tsx', 'utf8');

test('legal navigation follows one operational flow', () => {
  assert.match(layout, /label: 'Resumen'/);
  assert.match(layout, /label: 'Casos'/);
  assert.match(layout, /label: 'Control regulatorio'/);
  assert.match(layout, /label: 'Permisos'/);
  assert.match(layout, /label: 'Contratos'/);
  assert.match(layout, /label: 'Documentos'/);
});

test('overview explains signal to closure flow', () => {
  assert.match(overview, /1\. Señal/);
  assert.match(overview, /2\. Caso/);
  assert.match(overview, /3\. Acción/);
  assert.match(overview, /4\. Evidencia/);
  assert.match(overview, /5\. Cierre/);
});

test('case queue is derived and does not create a second source of truth', () => {
  assert.match(casesApi, /derivedQueue: true/);
  assert.match(casesApi, /no crea una segunda fuente de verdad/);
  assert.match(casesApi, /getLegalComplianceOverview/);
  assert.match(casesApi, /loadRegulatoryIntelligenceContext/);
  assert.doesNotMatch(casesApi, /export async function (POST|PUT|PATCH|DELETE)/);
});

test('cases always expose operational owner, legal role, action and evidence', () => {
  assert.match(casesPage, /Dueño operativo/);
  assert.match(casesPage, /Qué hace Legal/);
  assert.match(casesPage, /Próxima acción/);
  assert.match(casesPage, /Plazo \/ evidencia/);
});
