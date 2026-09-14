import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const loader = fs.readFileSync('lib/intelligence/regulatory-intelligence-context.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/regulatory/context/route.ts', 'utf8');

test('regulatory intelligence context is advisory and never declares compliance', () => {
  assert.match(loader, /advisory_reference_only/);
  assert.match(loader, /Nunca prueba cumplimiento/);
  assert.match(loader, /complianceVerdictCalculated: false/);
  assert.match(loader, /evidencia operacional canónica de MOTIL mantiene precedencia/);
});

test('regulatory intelligence context derives visibility from existing module permissions', () => {
  assert.match(loader, /getModuleAccessLevel/);
  assert.match(loader, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(loader, /MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(loader, /MODULE_KEYS\.HSE_DOCUMENTACION/);
  assert.match(loader, /MODULE_KEYS\.LEGAL_MODULO/);
});

test('regulatory context remains tenant scoped through canonical evidence loader', () => {
  assert.match(loader, /loadRegulatoryCanonicalEvidence\(context, allowedScopes, limit\)/);
  assert.match(loader, /organizationId/);
});

test('regulatory context is fail-open', () => {
  assert.match(loader, /regulatory_context_unavailable/);
  assert.match(loader, /Continúa exclusivamente con evidencia operacional canónica/);
  assert.match(loader, /available: false/);
});

test('regulatory context endpoint is read-only', () => {
  assert.match(route, /export async function GET\(request: NextRequest\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /regulatory_intelligence_context_v1/);
});
