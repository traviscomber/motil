import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/decision-cases/sync-production/route.ts', import.meta.url);
const syncUiUrl = new URL('../components/dashboard/operational-decision-sync.tsx', import.meta.url);

const route = await readFile(routeUrl, 'utf8');
const syncUi = await readFile(syncUiUrl, 'utf8');

test('production decision cases use canonical source fidelity evidence and tenant scope', () => {
  assert.match(route, /production_source_fidelity_exceptions_v1/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /target_domain: 'production'/);
  assert.match(route, /source_domain: 'executive'/);
});

test('production cases aggregate source debt instead of creating one case per row', () => {
  assert.match(route, /const grouped = new Map/);
  assert.match(route, /operational:production:source-fidelity:/);
  assert.match(route, /group\.length/);
  assert.match(route, /slice\(0, 8\)/);
});

test('production cases preserve source semantics and never infer missing operational truth', () => {
  assert.match(route, /authority: 'advisory_only'/);
  assert.match(route, /No estimar fino recuperado/i);
  assert.match(route, /no demuestra por sí solo una pérdida de producción, una causa raíz ni un riesgo probabilístico/i);
  assert.doesNotMatch(route, /from\('production_[^']+'\)\s*\.update/);
});

test('production archival requires exact disappearance of the canonical exception type', () => {
  assert.match(route, /async function isResolved/);
  assert.match(route, /\.eq\('domain', domain\)/);
  assert.match(route, /\.eq\('exception_type', exceptionType\)/);
  assert.match(route, /if \(!\(await isResolved\(context\.supabase, context\.organizationId, decisionKey\)\)\) continue/);
});

test('decision center revalidates production together with the existing operational domains', () => {
  assert.match(syncUi, /decision-cases\/sync-production/);
  assert.match(syncUi, /Promise\.all/);
  assert.match(syncUi, /fidelidad de Producción/i);
});
