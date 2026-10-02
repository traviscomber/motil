import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const toolsUrl = new URL('../lib/maintenance/senior-assistant-tools.ts', import.meta.url);
const routeUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const healthUrl = new URL('../app/api/maintenance/senior-assistant/health/route.ts', import.meta.url);
const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);

test('maintenance assistant resolves people from canonical directory instead of hardcoded names', async () => {
  const [tools, route] = await Promise.all([readFile(toolsUrl, 'utf8'), readFile(routeUrl, 'utf8')]);
  assert.match(tools, /name: 'search_people'/);
  assert.match(tools, /name: 'get_person_work_context'/);
  assert.match(tools, /normalizedPersonText/);
  assert.match(tools, /normalize\('NFD'\)/);
  assert.match(tools, /editDistance/);
  assert.match(route, /from\('people'\)/);
  assert.match(route, /people: people\.data \|\| \[\]/);
  assert.doesNotMatch(tools, /Ariel López|Mauricio Astudillo|Joaquín Martínez|José Tapia/);
});

test('person work context keeps identity separate from operational attribution', async () => {
  const tools = await readFile(toolsUrl, 'utf8');
  assert.match(tools, /assigned_open_work_orders/);
  assert.match(tools, /direct_reports/);
  assert.match(tools, /supervisor_name/);
  assert.match(tools, /no implican responsabilidad causal por una falla/i);
});

test('assistant identifies the authenticated canonical person and requires confirmation for ambiguity', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /resolvePersonIdentity/);
  assert.match(route, /Persona canónica/);
  assert.match(route, /usa search_people antes de asumir identidad/i);
  assert.match(route, /más de una coincidencia plausible/i);
  assert.match(route, /No atribuyas una falla, intervención o decisión/i);
});

test('canonical fallback can answer people questions without generative AI', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /executeMaintenanceSeniorTool\('search_people'/);
  assert.match(route, /executeMaintenanceSeniorTool\('get_person_work_context'/);
  assert.match(route, /OT abiertas asignadas/);
});

test('people provenance and health are visible', async () => {
  const [health, widget] = await Promise.all([readFile(healthUrl, 'utf8'), readFile(widgetUrl, 'utf8')]);
  assert.match(health, /\['people'/);
  assert.match(widget, /search_people: 'Personas'/);
  assert.match(widget, /get_person_work_context: 'Contexto de persona'/);
});


test('canonical fallback recognizes natural person-first OT phrasing', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /ot tiene/);
  assert.match(route, /ots tiene/);
});
