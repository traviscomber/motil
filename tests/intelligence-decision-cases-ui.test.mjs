import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/intelligence/decision-cases/route.ts', import.meta.url);
const panelUrl = new URL('../components/dashboard/decision-cases-panel.tsx', import.meta.url);
const layoutUrl = new URL('../components/dashboard/decision-center-shell.tsx', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Decision Center surfaces advisory cases only on the decisions home', async () => {
  const [layout, panel] = await Promise.all([read(layoutUrl), read(panelUrl)]);
  assert.match(layout, /pathname === '\/dashboard\/decisiones'/);
  assert.match(layout, /DecisionCasesPanel/);
  assert.match(panel, /Casos de decisión del Intelligence Core/);
  assert.match(panel, /Advisory/);
  assert.match(panel, /No canónico/);
  assert.match(panel, /No aprueban, ejecutan ni reemplazan decisiones operacionales/);
});

test('handoff UI creates only from a server-resolved grounded Core analysis', async () => {
  const [route, panel] = await Promise.all([read(routeUrl), read(panelUrl)]);
  assert.match(panel, /action: 'create_latest'/);
  assert.match(panel, /sourceDomain, targetDomain/);
  assert.doesNotMatch(panel, /evidenceRefs/);
  assert.match(route, /latestGroundedCoreMessage/);
  assert.match(route, /CORE_SOURCE_DOMAINS/);
  assert.match(route, /Array\.isArray\(row\.source_refs\) && row\.source_refs\.length > 0/);
  assert.match(route, /Consulta primero al asistente correspondiente/);
});

test('latest grounded handoff revalidates permissions and prevents duplicate open cases', async () => {
  const route = await read(routeUrl);
  assert.match(route, /canAccessDecisionCaseDomain\(request, sourceDomain\)/);
  assert.match(route, /canAccessDecisionCaseDomain\(request, message\.domain\)/);
  assert.match(route, /canAccessDecisionCaseDomain\(request, targetDomain\)/);
  assert.match(route, /\.eq\('source_message_id', message\.id\)/);
  assert.match(route, /\.eq\('target_domain', targetDomain\)/);
  assert.match(route, /duplicate: true/);
});

test('maintenance and geology are handoff targets without changing their specialist runtimes', async () => {
  const panel = await read(panelUrl);
  const route = await read(routeUrl);
  assert.match(panel, /'maintenance', 'geology'/);
  assert.match(panel, /Mantención y Geología reciben el caso como referencia advisory; sus especialistas no son modificados/);
  assert.match(route, /maintenance: 'maintenance'/);
  assert.doesNotMatch(route, /maintenance_work_orders[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(route, /geolog[\s\S]{0,220}\.(insert|update|delete)\(/i);
});

test('Decision Case mutations remain limited to advisory case metadata', async () => {
  const route = await read(routeUrl);
  assert.match(route, /\.from\('motil_ai_decision_cases'\)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /\.from\('role_tasks_actionable_v1'\)[\s\S]{0,320}\.(insert|update|delete)\(/);
  assert.doesNotMatch(route, /\.from\('procurement_award_decisions'\)/);
  assert.doesNotMatch(route, /\.from\('corrective_actions'\)/);
});
