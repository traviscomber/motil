import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readinessLib = new URL('../lib/rrhh-readiness.ts', import.meta.url);
const readinessApi = new URL('../app/api/rrhh/readiness/route.ts', import.meta.url);
const contractorsApi = new URL('../app/api/rrhh/contractors/route.ts', import.meta.url);
const readinessPage = new URL('../app/dashboard/rrhh/operacion/page.tsx', import.meta.url);
const contractorPage = new URL('../app/dashboard/rrhh/contratistas/page.tsx', import.meta.url);
const personPage = new URL('../app/dashboard/rrhh/personas/[id]/page.tsx', import.meta.url);
const layout = new URL('../app/dashboard/rrhh/layout.tsx', import.meta.url);

test('faena readiness refuses to infer APTO without an explicit site policy', async () => {
  const source = await readFile(readinessLib, 'utf8');
  assert.match(source, /if \(!input\.policyConfigured\)/);
  assert.match(source, /status: 'conditional'/);
  assert.match(source, /requisitos explícitos de habilitación/i);
  assert.match(source, /input\.requirementsSatisfied === true/);
  assert.match(source, /status: 'ready'/);
});

test('readiness API is tenant scoped and batches person evidence lookups', async () => {
  const source = await readFile(readinessApi, 'utf8');
  assert.match(source, /const BATCH_SIZE = 50/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /people_employment_assignments/);
  assert.match(source, /person_credentials/);
  assert.match(source, /person_competencies/);
  assert.match(source, /person_epp_assignments/);
  assert.match(source, /policyConfigured: false/);
});

test('contractor 360 starts from tenant-owned EECC before joining legacy startup folders', async () => {
  const source = await readFile(contractorsApi, 'utf8');
  assert.match(source, /\.from\('eecc'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.in\('created_by', creatorBatch\)/);
  assert.match(source, /normalizeRutDigits\(folder\.empresa_rut\)/);
  assert.match(source, /El estado mostrado es documental/);
});

test('RRHH UI exposes habilitation and contractor 360 without duplicating the operational inbox', async () => {
  const [readiness, contractors, person, navigation] = await Promise.all([
    readFile(readinessPage, 'utf8'),
    readFile(contractorPage, 'utf8'),
    readFile(personPage, 'utf8'),
    readFile(layout, 'utf8'),
  ]);
  assert.match(readiness, /Habilitación para faena/);
  assert.match(readiness, /no declara una persona apta sin requisitos explícitos/i);
  assert.match(contractors, /Contratistas 360/);
  assert.match(contractors, /Control contractual/);
  assert.match(person, /Habilitación para faena/);
  assert.match(navigation, /Habilitación/);
  assert.match(navigation, /Contratistas/);
  assert.match(navigation, /\/dashboard\/tareas/);
});
