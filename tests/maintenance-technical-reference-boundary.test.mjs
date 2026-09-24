import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/assets/[id]/technical-sheet/route.ts', 'utf8');
const candidate = fs.readFileSync('components/maintenance/asset-technical-reference-candidate.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/equipos/[id]/ficha-tecnica/page.tsx', 'utf8');

test('technical sheet route requires maintenance module access and tenant context', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /getOrganizationContext\(request\)/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
});

test('technical references stay candidates until canonical manufacturer and model agree', () => {
  assert.match(api, /hasVerifiedReferenceIdentity/);
  assert.match(api, /assetOrigin === 'canonical_master'/);
  assert.match(api, /asset\.manufacturer/);
  assert.match(api, /asset\.model/);
  assert.match(api, /reference_candidate_pending_validation/);
  assert.match(api, /canonical_identity_match/);
});

test('unvalidated text or family similarity cannot create operational maintenance signals', () => {
  assert.match(api, /family: trustedReference\?\.family \|\| null/);
  assert.match(api, /preventiveAlerts: trustedReference \? buildReferencePreventiveAlerts\(trustedReference\) : \[\]/);
  assert.match(api, /referenceSheet: trustedReference/);
  assert.match(api, /componentProfileAuthority: 'suggested_from_inferred_family_non_canonical'/);
  assert.match(api, /cannot materialize specifications, preventive alerts, operational status, or canonical identity/);
});

test('cost-center fallback does not invent active operational status', () => {
  assert.match(api, /status: costCenter\.status \?\? null/);
  assert.doesNotMatch(api, /status: costCenter\.status \?\? 'activo'/);
});

test('maintenance UI makes the pending-reference boundary explicit', () => {
  assert.match(candidate, /Referencia técnica sugerida/);
  assert.match(candidate, /Pendiente de validación/);
  assert.match(candidate, /no forma parte de la identidad canónica/);
  assert.match(candidate, /No materializa especificaciones, estado operacional ni alertas preventivas/);
  assert.match(candidate, /no autoriza crear una OT/);
  assert.match(page, /AssetTechnicalReferenceCandidate/);
});
