import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route=await readFile(new URL('../app/api/produccion/topografia/brechas/route.ts',import.meta.url),'utf8');
const widget=await readFile(new URL('../components/production/topografia-evidence-queue.tsx',import.meta.url),'utf8');
const topography=await readFile(new URL('../components/production/topografia-dashboard.tsx',import.meta.url),'utf8');
test('Topography evidence is checked for permissions and scoped by organization',()=>{
  assert.match(route,/requireModuleAccess\(request,MODULE_KEYS\.PROD_TOPOGRAFIA\)/);
  assert.match(route,/getOrganizationContext\(request\)/);
  assert.match(route,/\.eq\('organization_id',context\.organizationId\)/);
  assert.match(route,/\.limit\(RECORD_LIMIT\)/);
  assert.match(route,/count:'exact'/);
  assert.match(route,/private, no-store/);
  assert.doesNotMatch(route,/\.(insert|update|upsert|delete|rpc)\(/);
});
test('Topography embeds one evidence queue with search, filters and traceable source',()=>{
  assert.match(topography,/TopographyEvidenceQueue/);
  assert.match(widget,/Brechas documentales de Topografía/);
  assert.match(widget,/filterTopographyEvidence/);
  assert.match(widget,/Copiar requerimiento/);
  assert.match(widget,/Sin sondajes que coincidan con los filtros/);
  assert.match(widget,/cobertura parcial/);
  assert.match(widget,/Auditoría de origen/);
  assert.match(widget,/source_report_count/);
  assert.doesNotMatch(widget,/avance.*ejecutado: [0-9]/i);
});
