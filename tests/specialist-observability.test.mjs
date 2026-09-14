import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helper = await readFile(new URL('../lib/intelligence/specialist-observability.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/evaluation/recent/route.ts', import.meta.url), 'utf8');

test('specialist observability is derived only from observed tool traces', () => {
  assert.match(helper, /attributionAuthority: 'observed_tool_trace_only'/);
  assert.match(helper, /inferredFromPrompt: false/);
  assert.match(helper, /noPromptInference: true/);
  assert.match(helper, /noUiAgentSelection: true/);
  assert.doesNotMatch(helper, /prompt|message|question/i);
});

test('known Executive Core tools map to the specialists they actually read', () => {
  assert.match(helper, /read_executive_production: \['executive_core', 'production'\]/);
  assert.match(helper, /read_executive_maintenance: \['executive_core', 'maintenance'\]/);
  assert.match(helper, /read_executive_inventory: \['executive_core', 'inventory'\]/);
  assert.match(helper, /read_executive_procurement: \['executive_core', 'procurement'\]/);
  assert.match(helper, /read_executive_finance: \['executive_core', 'finance'\]/);
  assert.match(helper, /read_equipment_intelligence: \['executive_core', 'equipment'\]/);
  assert.match(helper, /read_executive_supply_chain: \['executive_core', 'maintenance', 'inventory', 'procurement'\]/);
});

test('evaluation endpoint exposes per-run and aggregate specialist traces without mutations', () => {
  assert.match(route, /source_refs/);
  assert.match(route, /deriveObservedSpecialists/);
  assert.match(route, /aggregateObservedSpecialists/);
  assert.match(route, /specialistAttributionCoverage/);
  assert.match(route, /runs: enrichedRuns/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
});
