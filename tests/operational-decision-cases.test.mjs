import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/decision-cases/sync/route.ts', import.meta.url);
const productionUrl = new URL('../lib/intelligence/production-decision-cases.ts', import.meta.url);
const layoutUrl = new URL('../app/dashboard/decisiones/layout.tsx', import.meta.url);

const source = await readFile(routeUrl, 'utf8');
const production = await readFile(productionUrl, 'utf8');
const layout = await readFile(layoutUrl, 'utf8');

test('operational decision sync derives only from reproducible canonical read models', () => {
  assert.match(source, /preventive_maintenance_hour_status_v1/);
  assert.match(source, /work_order_close_readiness_v2/);
  assert.match(source, /production_geology_2026_readiness_v1/);
  assert.match(source, /work_order_supply_chain_v1/);
  assert.match(production, /production_source_fidelity_exceptions_v1/);
  assert.doesNotMatch(source, /production_geology_geologist_queue_v3/);
  assert.match(source, /\.eq\('organization_id', organizationId\)/);
  assert.match(production, /\.eq\('organization_id', organizationId\)/);
});

test('operational cases remain advisory and do not mutate operational truth', () => {
  assert.match(source, /authority: 'advisory_only'/);
  assert.doesNotMatch(source, /from\('maintenance_work_orders'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('preventive_maintenance_schedules'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('production_geology_[^']+'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('stock_movements'\)\s*\.insert/);
  assert.doesNotMatch(source, /from\('procurement_operational_orders'\)\s*\.(insert|update)/);
  assert.doesNotMatch(production, /\.(insert|update|delete)\(/);
  assert.match(source, /no modifica stock ni órdenes de compra/i);
  assert.match(source, /no altera datos de Producción/i);
});

test('decision sync consolidates cases by canonical operational object', () => {
  assert.match(source, /operational:maintenance:preventive:/);
  assert.match(source, /operational:maintenance:closure:/);
  assert.match(source, /operational:geology:readiness:/);
  assert.match(source, /operational:inventory:work-order-shortage:/);
  assert.match(source, /operational:procurement:work-order-supply:/);
  assert.match(production, /operational:production:fidelity:/);
  assert.match(source, /neq\('readiness_state', 'operational_geology_available'\)/);
});

test('inventory and procurement cases use the shared work-order supply chain', () => {
  assert.match(source, /shortage_without_request/);
  assert.match(source, /waiting_procurement/);
  assert.match(source, /waiting_delivery/);
  assert.match(source, /material_shortage_count/);
  assert.match(source, /undelivered_order_count/);
  assert.match(source, /canAccessDecisionCaseDomain\(request, 'inventory'\)/);
  assert.match(source, /canAccessDecisionCaseDomain\(request, 'procurement'\)/);
});

test('production cases use source-specific cutoffs and exact aggregation', () => {
  assert.match(production, /CURRENT_WINDOW_DAYS = 31/);
  assert.match(production, /FIDELITY_SPECS/);
  assert.match(production, /sourceTable: 'production_drilling_source_reports'/);
  assert.match(production, /sourceTable: 'production_drill_holes'/);
  assert.match(production, /sourceTable: 'production_fine_copper_v1'/);
  assert.match(production, /sourceTable: 'production_concentrate_shipments'/);
  assert.match(production, /count: 'exact', head: true/);
  assert.doesNotMatch(production, /\.limit\(500\)/);
  assert.match(source, /canAccessDecisionCaseDomain\(request, 'production'\)/);
  assert.match(source, /productionDecisionCandidates/);
});

test('production fidelity cases preserve semantic boundaries', () => {
  assert.match(production, /no demuestra por sí sola una falla física/i);
  assert.match(production, /no demuestra.*incumplimiento productivo/i);
  assert.match(production, /no demuestra.*causa raíz/i);
  assert.match(production, /ventana vigente de su propia fuente/i);
});

test('production archival fails closed without a verifiable source cutoff', () => {
  assert.match(production, /if \(!spec\) return false/);
  assert.match(production, /if \(!window\) return false/);
  assert.match(production, /return window\.count === 0/);
});

test('archival requires exact canonical resolution and respects currently authorized domains', () => {
  assert.match(source, /async function isResolved/);
  assert.match(source, /if \(!\(await isResolved\(context\.supabase, context\.organizationId, decisionKey\)\)\) continue/);
  assert.match(source, /\.in\('target_domain', authorizedDomains\)/);
  assert.match(source, /readiness_state === 'operational_geology_available'/);
  assert.match(source, /material_shortage_count \|\| 0\) === 0/);
  assert.match(source, /!\['shortage_without_request', 'waiting_procurement', 'waiting_delivery'\]\.includes/);
  assert.match(source, /isProductionDecisionResolved/);
});

test('decision center exposes explicit human revalidation', () => {
  assert.match(layout, /OperationalDecisionSync/);
  assert.match(layout, /isDecisionHome \? <OperationalDecisionSync \/>/);
});
