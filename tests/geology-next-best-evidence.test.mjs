import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/next-best-evidence.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/next-best-evidence/route.ts', import.meta.url);
const workspaceUrl = new URL('../components/production/geologia-next-best-evidence.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('next best evidence avoids geological pseudo scoring', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /affected_patterns/);
  assert.match(builder, /affected_holes/);
  assert.doesNotMatch(builder, /patternWeight|evidenceWeight|score:/);
});

test('sparse dimensions become canonical source boundaries instead of mass recovery work', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /SOURCE_BOUNDARY_COVERAGE_THRESHOLD = 0\.10/);
  assert.match(builder, /menos del 10% del universo de sondajes/i);
  assert.match(builder, /no como una tarea masiva de recuperación/i);
  assert.match(builder, /sourceBoundaryCategories/);
  assert.match(builder, /suppressed_recovery_rows/);
  assert.match(builder, /scope_boundaries/);
});

test('formal logging boundary uses the canonical interval classifier', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /classifyIntervalEvidence/);
  assert.match(builder, /explicit_formal_logging/);
  assert.match(builder, /production_drill_intervals/);
});

test('priorities require canonical readiness but degrade optional derived evidence instead of returning 500', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /matrixPromise = buildInterpretationMatrix\(args\)/);
  assert.match(builder, /\.catch\(\(error\) => \(\{ value: null, error:/);
  assert.match(builder, /if \(readiness\.error\) throw new Error/);
  assert.match(builder, /intervals\.error \? \[\] :/);
  assert.match(builder, /chemistry\.error \? \[\] :/);
  assert.match(builder, /optional_source_warnings/);
  assert.match(builder, /optional source unavailable/);
});

test('next best evidence API remains tenant and geology access scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(route, /getOrganizationContext/);
});

test('evidence exceptions stay canonical first and outside the operational task queue', async () => {
  const workspace = await readFile(workspaceUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(workspace, /Excepciones de evidencia/);
  assert.match(workspace, /Sólo faltantes que vale la pena revisar/);
  assert.match(workspace, /Esta vista no es una cola de trabajo/);
  assert.match(workspace, /Sin excepciones de evidencia/);
  assert.match(workspace, /Límites conocidos de la fuente/);
  assert.match(workspace, /no como lista de datos que haya que conseguir/i);
  assert.match(shell, /\['priorities', 'Excepciones'\]/);
  assert.match(shell, /secondary=\{navigationItems.slice\(3\)\}/);
  assert.match(shell, /GeologiaNextBestEvidence/);
  assert.doesNotMatch(shell, /GeologiaEvidenceRecoveryCampaign|GeologiaEvidenceRecoverySources|GeologiaEvidenceRecoveryWorklist/);
});
