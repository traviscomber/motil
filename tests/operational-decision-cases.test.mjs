import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/decision-cases/sync/route.ts', import.meta.url);
const layoutUrl = new URL('../app/dashboard/decisiones/layout.tsx', import.meta.url);

const source = await readFile(routeUrl, 'utf8');
const layout = await readFile(layoutUrl, 'utf8');

test('operational decision sync derives only from reproducible canonical read models', () => {
  assert.match(source, /preventive_maintenance_hour_status_v1/);
  assert.match(source, /work_order_close_readiness_v2/);
  assert.match(source, /production_geology_2026_readiness_v1/);
  assert.doesNotMatch(source, /production_geology_geologist_queue_v3/);
  assert.match(source, /\.eq\('organization_id', organizationId\)/);
});

test('operational cases remain advisory and do not mutate operational truth', () => {
  assert.match(source, /authority: 'advisory_only'/);
  assert.doesNotMatch(source, /from\('maintenance_work_orders'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('preventive_maintenance_schedules'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('production_geology_[^']+'\)\s*\.update/);
  assert.match(source, /no crea\/cierra OT, no cambia activos y no escribe hechos geológicos/i);
});

test('decision sync consolidates geology by drill hole and maintenance by canonical process id', () => {
  assert.match(source, /operational:maintenance:preventive:/);
  assert.match(source, /operational:maintenance:closure:/);
  assert.match(source, /operational:geology:readiness:/);
  assert.match(source, /neq\('readiness_state', 'operational_geology_available'\)/);
});

test('archival requires exact canonical resolution and respects currently authorized domains', () => {
  assert.match(source, /async function isResolved/);
  assert.match(source, /if \(!\(await isResolved\(context\.supabase, context\.organizationId, decisionKey\)\)\) continue/);
  assert.match(source, /\.in\('target_domain', authorizedDomains\)/);
  assert.match(source, /readiness_state === 'operational_geology_available'/);
});

test('decision center exposes explicit human revalidation', () => {
  assert.match(layout, /OperationalDecisionSync/);
  assert.match(layout, /isDecisionHome \? <OperationalDecisionSync \/>/);
});
