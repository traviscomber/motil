import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const api = await readFile(new URL('../app/api/intelligence/engineering-assistant/route.ts',import.meta.url), 'utf8');
const widget = await readFile(new URL('../components/intelligence/senior-assistant-widget.tsx',import.meta.url),'utf8');
const body = await readFile(new URL('../components/intelligence/specialist-assistant-body.tsx',import.meta.url),'utf8');

test('Engineering assistant verifies cargo and Topography permission on server before sources', () => {
  assert.match(api, /getOrganizationContext\(request\)/);
  assert.match(api, /JEFE ING\. PLA MINA/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /getModuleAccessLevel\(context\.userId, context\.role, MODULE_KEYS\.PROD_TOPOGRAFIA\)/);
  assert.match(api, /access !== 'ED' && access !== 'LEC'/);
  assert.match(api, /status: 403/);
  assert.doesNotMatch(api, /req\.cookies|request\.cookies/);
});

test('Engineering evidence is tenant scoped, cargo scoped and bounded', () => {
  for (const source of ['production_monthly_plans','production_monthly_plan_lines','production_geology_topography_source_gap_2026_v1','role_tasks_actionable_v1']) {
    assert.match(api, new RegExp(source));
  }
  assert.match(api, /\.eq\('organization_id', organizationId\)/);
  assert.match(api, /\.eq\('cargo_id', context\.cargoId\)/);
  assert.match(api, /limit\(160\)/);
  assert.match(api, /limit\(60\)/);
  assert.match(api, /count:'exact'/);
});

test('Assistant is read-only, stateless and requires evidence for its answers', () => {
  assert.match(api, /assessPlanPeriod\(plan, currentChileDate\(\)\)/);
  assert.match(api, /verifiedExecution es false/);
  assert.match(api, /stateless_read_only/);
  assert.match(api, /operationalMutationExecuted: false/);
  assert.match(api, /No se obtuvo una respuesta verificable/);
  assert.doesNotMatch(api, /\.(insert|upsert|update|delete|rpc)\(/);
  assert.doesNotMatch(api, /'\/api\/(maintenance|finance|production)\/'/);
});

test('Engineering assistant is available at Home and Topography only; user cookie never authorizes server data', () => {
  assert.match(widget, /useAuth\(\)/);
  assert.match(widget, /pathname === '\/dashboard'/);
  assert.match(widget, /pathname\.startsWith\('\/dashboard\/produccion\/topografia'\)/);
  assert.match(widget, /\/api\/intelligence\/engineering-assistant/);
  assert.match(widget, /endpoint=\{specialist\.endpoint\}/);
  assert.match(body, /stateless \? <span/);
  assert.match(body, /Consulta sin historial/);
  assert.match(body, /Memoria \{memoryCount\}/);
  assert.doesNotMatch(widget, /<SpecialistAssistantBody[^>]*\/api\/intelligence\/role-assistant/);
});
