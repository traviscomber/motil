import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const library = fs.readFileSync('lib/intelligence/regulatory-evidence-link.ts', 'utf8');
const canonical = fs.readFileSync('lib/intelligence/regulatory-canonical-evidence.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/regulatory/evidence-linking/route.ts', 'utf8');
const context = fs.readFileSync('lib/intelligence/regulatory-intelligence-context.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260914130000_add_tenant_safe_hse_inspection_mapping.sql', 'utf8');

test('regulatory evidence linking never declares compliance', () => {
  assert.match(library, /evidence_linking_never_declares_legal_compliance/);
  assert.match(library, /canonical_operational_sources_remain_authoritative/);
  assert.match(library, /missing_reference_is_a_validation_gap_not_proof_of_non_compliance/);
  assert.match(route, /complianceVerdictCalculated: false/);
});

test('not applicable requires human validation', () => {
  assert.match(library, /notApplicableBoundary: 'not_applicable_requires_human_validation'/);
  assert.match(library, /humanValidatedNotApplicable \? 'not_applicable' : 'requires_review'/);
});

test('evidence status remains deterministic and advisory', () => {
  assert.match(library, /'observed'/);
  assert.match(library, /'missing'/);
  assert.match(library, /'requires_review'/);
  assert.doesNotMatch(library, /openai|anthropic|gemini/i);
  assert.doesNotMatch(canonical, /openai|anthropic|gemini/i);
});

test('canonical regulatory evidence reads only organization scoped sources', () => {
  assert.match(canonical, /from\('canonical_assets_current'\)[\s\S]*eq\('organization_id', context\.organizationId\)/);
  assert.match(canonical, /from\('documents'\)[\s\S]*eq\('organization_id', context\.organizationId\)/);
  assert.match(canonical, /from\('hse_commitments'\)[\s\S]*eq\('organization_id', context\.organizationId\)/);
  assert.match(canonical, /from\('hse_facilities'\)[\s\S]*eq\('organization_id', context\.organizationId\)/);
  assert.match(canonical, /from\('canonical_hse_inspections_v1'\)[\s\S]*eq\('organization_id', context\.organizationId\)/);
});

test('legacy HSE inspections require an explicit tenant mapping before becoming canonical evidence', () => {
  assert.match(migration, /motil_hse_inspection_tenant_links/);
  assert.match(migration, /inspection_id uuid primary key references public\.hse_inspections\(id\)/);
  assert.match(migration, /organization_id uuid not null references public\.organizations\(id\)/);
  assert.match(migration, /No row is mapped automatically/);
  assert.match(migration, /canonical_hse_inspections_v1/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /revoke all on public\.canonical_hse_inspections_v1 from anon, authenticated/);
  assert.doesNotMatch(canonical, /\.from\('hse_inspections'\)/);
  assert.match(canonical, /tenant_mapping_verified: true/);
  assert.match(canonical, /unmapped hse_inspections rows remain excluded/);
});

test('HSE module access authorizes the mapped inspection scope without a new bypass', () => {
  assert.match(context, /scopes\.push\('hse'\);[\s\S]*scopes\.push\('inspections'\)/);
  assert.match(route, /allowedScopes\.push\('hse'\);[\s\S]*allowedScopes\.push\('inspections'\)/);
  assert.match(context, /MODULE_KEYS\.HSE_DOCUMENTACION/);
  assert.match(context, /MODULE_KEYS\.HSE_TABLERO/);
  assert.match(context, /MODULE_KEYS\.HSE_RIESGOS/);
});

test('regulatory evidence endpoint is permission aware and read-only', () => {
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /getModuleAccessLevel/);
  assert.match(route, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(route, /MODULE_KEYS\.HSE_DOCUMENTACION/);
  assert.match(route, /export async function GET\(request: NextRequest\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /advisory_reference_only/);
  assert.match(route, /regulatory_evidence_linking_v2/);
});
