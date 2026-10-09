import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const api=await readFile(new URL('../app/api/intelligence/engineering-evidence-dossier/route.ts',import.meta.url),'utf8');
const view=await readFile(new URL('../components/production/engineering-regulatory-dossier.tsx',import.meta.url),'utf8');
const topography=await readFile(new URL('../components/production/topografia-dashboard.tsx',import.meta.url),'utf8');
const legal=await readFile(new URL('../app/api/legal/cases/route.ts',import.meta.url),'utf8');

test('document inventory stays tenant-scoped and does not expose Legal documents/files',()=>{
  assert.match(api,/getOrganizationContext\(request\)/);
  assert.match(api,/MODULE_KEYS\.PROD_TOPOGRAFIA/);
  assert.match(api,/\.eq\('organization_id',orgId\)/);
  assert.match(api,/\.in\('module',TECHNICAL_MODULES\)/);
  assert.match(api,/\.in\('source_kind',TECHNICAL_SOURCE_KINDS\)/);
  assert.match(api,/\.eq\('source_type',CASE_TYPE\)/);
  assert.match(api,/\.in\('source_id',sourceIds\)/);
  assert.doesNotMatch(api,/MODULE_KEYS\.LEGAL_MODULO|current_file_url|file_url|file_path|storage_path/);
});
test('review request requires ED and exact obligation; duplicate clicks cannot reset a Legal case',()=>{
  assert.match(api,/if \(!auth\.canSubmit\)/);
  assert.match(api,/listSernageominObligations\('engineering'\)\.find/);
  assert.match(api,/ignoreDuplicates:true/);
  assert.match(api,/onConflict:'organization_id,source_type,source_id'/);
  assert.match(api,/status:'new',evidence_status:'pending'/);
  assert.match(api,/due_at:null/);
  assert.match(api,/created_by:auth\.context\.userId/);
  assert.match(api,/request\.headers\.get\('origin'\)/);
  assert.doesNotMatch(api,/\.update\(|status:'closed'/);
  assert.match(legal,/MODULE_KEYS\.LEGAL_MODULO/);
});
test('topography contains one actionable review panel with verified source caveats',()=>{
  assert.match(topography,/<EngineeringRegulatoryDossier \/>/);
  assert.doesNotMatch(topography,/data\.regulatoryGuidance\.items\.map/);
  assert.match(view,/Solicitar revisión a Legal/);
  assert.match(view,/Sin documentos de Ingeniería\/Topografía\/Producción en las fuentes consultadas/);
  assert.match(view,/contexto histórico, no respaldo regulatorio/);
  assert.match(view,/no sustituye nombramientos, resoluciones ni firma profesional/);
  assert.match(view,/item\.sourceUrl/);
  assert.doesNotMatch(view,/Cumplimiento certificado|100% cumplimiento|Regulación aprobada/);
});
