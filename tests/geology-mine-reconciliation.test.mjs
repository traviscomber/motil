import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const historyApiUrl = new URL('../app/api/produccion/geologia/historia-la-patagua/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);
const todayUrl = new URL('../components/production/geologia-today-decision-board.tsx', import.meta.url);
const resultsUrl = new URL('../components/production/geologia-results-decision-board.tsx', import.meta.url);
const pendingUrl = new URL('../components/production/geologia-pending-decision-queue.tsx', import.meta.url);
const mineOverviewUrl = new URL('../components/production/geologia-mine-evidence-overview.tsx', import.meta.url);
const readinessUrl = new URL('../lib/geology/evidence-readiness.ts', import.meta.url);
const canonicalContextUrl = new URL('../lib/geology-ai/canonical-context.ts', import.meta.url);
const promptUrl = new URL('../lib/geology-ai/prompt.ts', import.meta.url);
const historyUrl = new URL('../components/production/geologia-historical-canonical.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const pageUrl = new URL('../app/dashboard/produccion/geologia/page.tsx', import.meta.url);

test('geology mine assignment requires write access and remains organization scoped', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(api, /production_drilling_source_reports'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*reportId\)/);
  assert.match(api, /production_mine_sources'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*mineId\)/);
  assert.match(api, /Sector y pozo no se infieren/);
});

test('geology dashboard follows the La Patagua operating workflow', async () => {
  const [dashboard, today, results, pending, shell, page] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(todayUrl, 'utf8'),
    readFile(resultsUrl, 'utf8'),
    readFile(pendingUrl, 'utf8'),
    readFile(shellUrl, 'utf8'),
    readFile(pageUrl, 'utf8'),
  ]);
  assert.match(dashboard, /GeologiaTodayDecisionBoard/);
  assert.match(dashboard, /GeologiaResultsDecisionBoard/);
  assert.match(dashboard, /GeologiaPendingDecisionQueue/);
  assert.match(dashboard, /JSON\.stringify\(\{reportId,mineId\}\)/);
  assert.match(today, /La ausencia estructural de la fuente se informa, pero no se convierte en tarea/i);
  assert.match(today, /fuera de alcance/i);
  assert.doesNotMatch(today, /Completar ubicación de sondajes/);
  assert.match(today, /Ahora · \{currentYear\}/);
  assert.match(today, /Evidencia vigente primero/);
  assert.match(today, /currentWithMine/);
  assert.match(today, /currentWithSector/);
  assert.match(results, /no estimar ni inferir Cu/i);
  assert.match(results, /Resultados químicos canónicos históricos/);
  assert.match(results, /result_value/);
  assert.match(results, /result_unit/);
  assert.match(results, /evidencia histórica de muestra\/mina y no representan por sí solos la condición geológica vigente de 2026/i);
  assert.match(results, /Sin vínculo/);
  assert.match(results, /más recientes primero/);
  assert.match(pending, /Seleccionar mina/);
  assert.match(pending, /sector y pozo no se infieren/i);
  assert.match(pending, /Más reciente primero/);
  assert.match(shell, /\['today', 'Resumen'\]/);
  assert.match(shell, /\['holes', 'Ficha'\]/);
  assert.match(shell, /Resultados/);
  assert.match(shell, /\['pending', 'Tareas'\]/);
  assert.match(shell, /Histórico/);
  assert.match(shell, /<AreaNavigation label="Geología"/);
  assert.doesNotMatch(shell, /sticky top-0/);
  assert.doesNotMatch(shell, /Vistas principales de Geología/);
  assert.match(page, /GeologiaWorkspaceShell/);
});

test('dashboard and assistant share readiness evidence without turning sparse coverage into recovery work', async () => {
  const [overview, readiness, canonical, prompt] = await Promise.all([
    readFile(mineOverviewUrl, 'utf8'),
    readFile(readinessUrl, 'utf8'),
    readFile(canonicalContextUrl, 'utf8'),
    readFile(promptUrl, 'utf8'),
  ]);
  assert.match(overview, /buildMineEvidenceReadiness/);
  assert.match(overview, /Qué evidencia existe por mina/);
  assert.match(overview, /no ranking de minas ni lista de datos por pedir/i);
  assert.match(readiness, /locatedPct\+orientedPct\+purposePct/);
  assert.match(readiness, /primaryGap/);
  assert.match(canonical, /mine_evidence_readiness/);
  assert.match(canonical, /mine_needing_evidence_attention/);
  assert.match(canonical, /buildMineEvidenceReadiness/);
  assert.match(prompt, /Ese ranking es diagnóstico y debe coincidir con la UI/i);
  assert.match(prompt, /límite de la fuente y NO lo conviertas en una prioridad de recuperación/i);
  assert.match(prompt, /No pidas al usuario datos ausentes por defecto/i);
});

test('geology exposes canonical historical chemistry without inventing drill-hole links', async () => {
  const [api, history, results] = await Promise.all([readFile(apiUrl, 'utf8'), readFile(historyUrl, 'utf8'), readFile(resultsUrl, 'utf8')]);
  assert.match(api, /production_chemistry_results/);
  assert.match(api, /production_chemistry_results'[\s\S]*eq\('organization_id',\s*context\.organizationId\)/);
  assert.match(api, /production_drilling_operational_summary_v1/);
  assert.match(api, /sampleById/);
  assert.match(api, /mineById/);
  assert.match(api, /drill_hole_id:\s*sample\?\.drill_hole_id\s*\|\|\s*null/);
  assert.match(api, /no se asignan a sondajes sin evidencia/);
  assert.match(results, /chemistryResults/);
  assert.match(results, /Resultados químicos canónicos históricos/);
  assert.match(results, /no los convierte en muestras de sondaje/i);
  assert.match(history, /Histórico canónico de La Patagua/);
  assert.match(history, /vínculo canónico explícito/);
  assert.match(history, /Química histórica/);
  assert.match(history, /no se adhieren a pozos por similitud o fecha/);
  assert.match(history, /Sólo datos La Patagua/);
});

test('La Patagua historical geology endpoint exposes validated current-first head grade, live drilling and mine plan', async () => {
  const [historyApi, history] = await Promise.all([readFile(historyApiUrl, 'utf8'), readFile(historyUrl, 'utf8')]);
  assert.match(historyApi, /production_metallurgy_automatic_v1/);
  assert.match(historyApi, /production_metallurgy_automatic_v1'[\s\S]*eq\('organization_id',\s*context\.organizationId\)/);
  assert.match(historyApi, /order\('operation_date', \{ ascending: false \}\)/);
  assert.match(historyApi, /chronology: 'newest_first'/);
  assert.match(historyApi, /production_monthly_plans/);
  assert.match(historyApi, /production_monthly_plan_lines/);
  assert.match(historyApi, /production_drilling_source_reports/);
  assert.match(historyApi, /source: 'production_drilling_source_reports'/);
  assert.match(historyApi, /validation_status/);
  assert.match(historyApi, /=== 'valid'/);
  assert.match(historyApi, /provenance: 'La Patagua'/);
  assert.match(history, /Ahora · 2026/);
  assert.match(history, /Plan minero vigente/);
  assert.match(history, /Ley cabeza · más reciente primero/);
  assert.match(history, /Resultados químicos · más reciente primero/);
  assert.match(history, /Calculado directamente desde la tabla canónica vigente/);
  assert.match(history, /La lectura siempre prioriza el dato más reciente/);
  assert.doesNotMatch(history, /SERNAGEOMIN/i);
});

test('geology drill lists prioritize the latest activity while pending work remains priority ordered', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /production_drill_holes'[\s\S]*order\('start_at', \{ ascending: false, nullsFirst: false \}\)[\s\S]*order\('hole_code', \{ ascending: true \}\)/);
  assert.match(api, /recentDrillingQuery[\s\S]*order\('operation_date', \{ ascending: false \}\)[\s\S]*order\('source_row', \{ ascending: false \}\)/);
  assert.match(api, /production_drill_hole_location_review_queue_v5'[\s\S]*order\('operational_priority', \{ ascending: false \}\)/);
  const locationQueue = api.match(/production_drill_hole_location_review_queue_v5'[\s\S]*?\n\s*\]\);/)?.[0] || '';
  assert.doesNotMatch(locationQueue, /\.limit\(200\)/);
});

test('La Patagua geology API does not expose external geology context to the client', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.doesNotMatch(api, /externalContext:\s*contextRows/);
  assert.doesNotMatch(api, /contextQuality:\s*q/);
  assert.doesNotMatch(api, /sernageominRecords:\s*Number/);
});
