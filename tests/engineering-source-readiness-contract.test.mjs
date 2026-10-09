import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const api=await readFile(new URL('../app/api/produccion/topografia/route.ts',import.meta.url),'utf8');
const view=await readFile(new URL('../components/production/topografia-dashboard.tsx',import.meta.url),'utf8');
test('drilling readiness stays in existing access-scoped topography API',()=>{
  assert.match(api,/requireModuleAccess\(request, MODULE_KEYS\.PROD_TOPOGRAFIA\)/);
  assert.match(api,/\.eq\('organization_id',context\.organizationId\)/);
  assert.match(api,/\.gte\('operation_date',activePlan\.period_start\)/);
  assert.match(api,/\.lte\('operation_date',activePlan\.period_end\)/);
  assert.match(api,/summarizeEngineeringSourceReadiness/);
  assert.doesNotMatch(api,/\.rpc\(|\.update\(|\.delete\(|\.insert\(/);
});
test('UI never represents reviewed source metres as real topographic progress',()=>{
  assert.match(view,/Preparación de conciliación plan y ejecución/);
  assert.match(view,/Fuente de perforación del período del plan/);
  assert.match(view,/no representan avance topográfico validado/);
  assert.match(view,/No se calculan porcentajes de cumplimiento/);
});
