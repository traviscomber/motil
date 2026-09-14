import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/intelligence/executive-assistant/route.ts', 'utf8');

test('executive assistant consumes governed memory without changing authority', () => {
  assert.match(route, /loadExecutiveGovernedMemory/);
  assert.match(route, /MEMORIA GOBERNADA es contexto laboral estable NO CANÓNICO/);
  assert.match(route, /governedMemory\.promptContext/);
  assert.match(route, /authority: governedMemory\.authority/);
  assert.match(route, /errorCode: governedMemory\.errorCode/);
  assert.match(route, /contexto regulatorio, memoria, historial y Decision Cases conservan sus fronteras/);
});

test('governed memory stays separate from canonical evidence', () => {
  const memoryIndex = route.indexOf('${governedMemory.promptContext}');
  const regulatoryIndex = route.indexOf('${regulatoryContext.promptContext}');
  const evidenceIndex = route.indexOf('EVIDENCIA MOTIL CANÓNICA/AUTORIZADA');
  assert.ok(memoryIndex >= 0);
  assert.ok(regulatoryIndex > memoryIndex);
  assert.ok(evidenceIndex > regulatoryIndex);
  assert.doesNotMatch(route, /evidence\.governedMemory\s*=/);
  assert.doesNotMatch(route, /evidence\.regulatory\s*=/);
});
