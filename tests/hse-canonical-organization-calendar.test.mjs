import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hseDataUrl = new URL('../lib/api/hse-data.ts', import.meta.url);
const calendarApiUrl = new URL('../app/api/calendar/operational/route.ts', import.meta.url);
const overviewPageUrl = new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/page.tsx', import.meta.url);
const commitmentsPageUrl = new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/compromisos/page.tsx', import.meta.url);

test('HSE reads canonical documents from module_documents', async () => {
  const source = await readFile(hseDataUrl, 'utf8');
  assert.match(source, /'module_documents'/);
  assert.match(source, /column: 'module', value: 'prevención'/);
  assert.match(source, /column: 'category', value: 'documentos-hse'/);
  assert.match(source, /row\.provenance_status === 'canonical'/);
  assert.doesNotMatch(source, /'hse_master_documents'/);
});

test('HSE does not turn missing source data into perfect compliance', async () => {
  const source = await readFile(hseDataUrl, 'utf8');
  assert.match(source, /: null;/);
  assert.match(source, /availableCompliance/);
});

test('organization calendar distinguishes HSE and Legal work', async () => {
  const source = await readFile(calendarApiUrl, 'utf8');
  assert.match(source, /'maintenance' \| 'hse' \| 'legal' \| 'procurement'/);
  assert.match(source, /complianceSource/);
  assert.match(source, /source_label: complianceSourceLabel/);
});

test('HSE overview exposes canonical documents commitments and organization calendar', async () => {
  const overview = await readFile(overviewPageUrl, 'utf8');
  const commitments = await readFile(commitmentsPageUrl, 'utf8');
  assert.match(overview, /Documentos canónicos/);
  assert.match(overview, /Compromisos/);
  assert.match(overview, /Calendario organización/);
  assert.match(commitments, /Evidencia canónica/);
  assert.match(commitments, /Sin fecha registrada/);
});
