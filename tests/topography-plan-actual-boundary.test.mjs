import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardUrl = new URL('../components/production/topografia-dashboard.tsx', import.meta.url);
const routeUrl = new URL('../app/api/produccion/topografia/route.ts', import.meta.url);

test('topography keeps planning separate from actual canonical survey evidence', async () => {
  const [dashboard, route] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(routeUrl, 'utf8'),
  ]);

  assert.match(dashboard, /Plan vigente/);
  assert.match(dashboard, /Plan de referencia · no vigente/);
  assert.match(dashboard, /Plan vencido/);
  assert.match(dashboard, /Solicita un nuevo plan aprobado a Ingeniería/);
  assert.match(dashboard, /Plan espacial y evidencia topográfica real se mantienen separados/);
  assert.match(dashboard, /Sin fuente topográfica canónica/);
  assert.match(dashboard, /Actual topográfico/);
  assert.match(dashboard, /Sólo se muestran valores provenientes de la fuente topográfica canónica/);
  assert.match(dashboard, /Mineral a planta planificado/);
  assert.match(dashboard, /Control de cifras del plan/);
  assert.match(dashboard, /Perforación planificada/);
  assert.match(dashboard, /Desglose de perforación radial/);
  assert.doesNotMatch(dashboard, /label="Toneladas planificadas"/);
  assert.doesNotMatch(dashboard, /Avance real topográfico/);
  assert.doesNotMatch(dashboard, /Pendiente fuente canónica/);

  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_TOPOGRAFIA\)/);
  assert.match(route, /assessPlanPeriod/);
  assert.match(route, /planPeriod,/);
  assert.match(route, /summarizeCanonicalMonthlyPlan\(activePlan,planLines,planLineResult.count\)/);
  assert.match(route, /\.eq\('plan_id',activePlan.id\)/);
  assert.doesNotMatch(route, /planLines.reduce\(\(sum,l\)=>sum\+Number\(l.planned_tons/);
  assert.match(route, /actualSurveyPoints: null/);
  assert.match(route, /actualAdvanceM: null/);
  assert.match(route, /surveyCanonical: false/);
  assert.match(route, /coordinatesCanonical: false/);
  assert.match(route, /actualAdvanceCanonical: false/);
  assert.match(route, /MOTIL no simula esos valores/);
});
