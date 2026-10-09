import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const catalog = await readFile(new URL('../lib/intelligence/sernageomin-obligations.ts', import.meta.url), 'utf8');
const registry = await readFile(new URL('../lib/intelligence/regulatory-sources.ts', import.meta.url), 'utf8');

test('engineering guidance is integrated into existing SERNAGEOMIN catalog, not a duplicate compliance authority',()=>{
  assert.match(catalog,/sernageomin-qualified-project-engineer-and-mine-chief/);
  assert.match(catalog,/sernageomin-mine-plans-and-advance-records/);
  assert.match(catalog,/DS 132 art\. 33/);
  assert.match(catalog,/DS 132 art\. 34/);
  assert.match(catalog,/DS 132 art\. 60/);
  assert.match(catalog,/DS 132 art\. 61/);
  assert.match(catalog,/DS 132 art\. 22/);
  assert.match(catalog,/motilDomains: \['engineering'/);
  assert.match(registry,/id: 'sernageomin-ds-132'/);
  assert.match(registry,/www\.bcn\.cl\/leychile\/navegar\?idNorma=221064/);
});
test('a role name does not confer signature, mine-chief license or permission',()=>{
  assert.match(catalog,/NO equivale por sí solo/);
  assert.match(catalog,/No atribuir estas responsabilidades automáticamente al cargo de Ingeniería/);
  assert.match(catalog,/Empresa Minera/);
  assert.match(catalog,/humanValidationRequired: true/);
  assert.match(catalog,/does not determine legal applicability or prove compliance/);
  assert.doesNotMatch(catalog,/autoApprove|automaticSign|grantModulePermission/);
});
