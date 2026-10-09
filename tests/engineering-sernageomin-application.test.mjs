import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catalogue=await readFile(new URL('../lib/intelligence/sernageomin-obligations.ts',import.meta.url),'utf8');
const api=await readFile(new URL('../app/api/produccion/topografia/route.ts',import.meta.url),'utf8');
const screen=await readFile(new URL('../components/production/topografia-dashboard.tsx',import.meta.url),'utf8');
const assistant=await readFile(new URL('../app/api/intelligence/engineering-assistant/route.ts',import.meta.url),'utf8');
const legal=await readFile(new URL('../app/api/legal/sernageomin/route.ts',import.meta.url),'utf8');
const dossier=await readFile(new URL('../components/production/engineering-regulatory-dossier.tsx',import.meta.url),'utf8');

test('engineering regulatory subset reuses authoritative canonical catalogue rather than building another silo',()=>{
  assert.match(catalogue,/sernageomin-qualified-project-engineer-and-mine-chief/);
  assert.match(catalogue,/sernageomin-mine-plans-and-advance-records/);
  assert.match(api,/listSernageominObligations\('engineering'\)/);
  assert.match(api,/requireModuleAccess\(request, MODULE_KEYS\.PROD_TOPOGRAFIA\)/);
  assert.match(api,/complianceVerdictCalculated: false/);
  assert.match(api,/roleAssignmentVerified: false/);
  assert.doesNotMatch(api,/api\/legal\/sernageomin/);
});
test('Topography reference is compact, gives official sources and avoids false legal certification',()=>{
  assert.match(screen,/Criterios técnicos SERNAGEOMIN/);
  assert.match(screen,/no equivale automáticamente a Jefe de Mina/);
  assert.match(screen,/El seguimiento y cierre de obligaciones permanece en Legal/);
  assert.match(dossier,/item\.sourceUrl/);
  assert.match(dossier,/rel="noopener noreferrer"/);
  assert.doesNotMatch(screen,/marcar cumplido|Aprobar norma|Cumplimiento certificado/i);
});
test('role assistant uses DS 132 article references without granting Legal access',()=>{
  assert.match(assistant,/engineeringRegulatoryReference\(\)/);
  assert.match(assistant,/advisorySernageominReferences/);
  assert.match(assistant,/art\. 34/);
  assert.match(assistant,/art\. 33/);
  assert.match(assistant,/arts\. 60-61/);
  assert.match(assistant,/roleAssignmentVerified: false/);
  assert.match(assistant,/operationalMutationExecuted: false/);
  assert.doesNotMatch(assistant,/MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(legal,/MODULE_KEYS\.LEGAL_MODULO/);
});
