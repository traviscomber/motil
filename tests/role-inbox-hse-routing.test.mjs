import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const recordRoute = await readFile(new URL('../app/api/actions/hse-record/[kind]/[id]/route.ts', import.meta.url), 'utf8');
const actionPage = await readFile(new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/acciones/[kind]/[id]/page.tsx', import.meta.url), 'utf8');

test('role inbox deep-links incidents, inspections and risks to their HSE action record', () => {
  assert.match(inboxRoute, /kind === 'incident' \|\| kind === 'inspection' \|\| kind === 'risk'/);
  assert.match(inboxRoute, /prevencion-riesgos\/acciones\/\$\{kind\}\/\$\{rawId\}/);
});

test('HSE record API authorizes through the cargo task boundary before reading legacy sources', () => {
  assert.match(recordRoute, /getVisibleScopedRoleTask/);
  assert.doesNotMatch(recordRoute, /role_task_frontend_v1/);
  assert.match(recordRoute, /organizationId: context\.organizationId/);
  assert.match(recordRoute, /cargoId: profile\.cargo_id/);
  assert.match(recordRoute, /taskKey,/);
  assert.match(recordRoute, /authorizationBoundary: 'scoped_role_task_sources_v1'/);
  assert.match(recordRoute, /\.from\(source\)/);
  assert.match(recordRoute, /source = 'incidents'/);
  assert.match(recordRoute, /source = 'hse_inspections'/);
  assert.match(recordRoute, /source = 'risk_matrix'/);
});

test('HSE action workspace stays read-only and exposes cargo-specific action evidence', () => {
  assert.match(actionPage, /Qué corresponde hacer/);
  assert.match(actionPage, /data\.task\.role_action/);
  assert.match(actionPage, /data\.kind === 'inspection'/);
  assert.match(actionPage, /record\.inspection_number/);
  assert.match(actionPage, /No modifica automáticamente el registro HSE/);
  assert.doesNotMatch(actionPage, /method:\s*['\"](?:POST|PATCH|PUT|DELETE)['\"]/);
});
