import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const contract = fs.readFileSync('lib/intelligence/regulatory-mapping-review.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/regulatory/mapping-reviews/route.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260914123000_add_regulatory_mapping_reviews.sql', 'utf8');

test('accepted mappings require stable official anchors and exact regulatory codes', () => {
  assert.match(contract, /stable_page_anchor/);
  assert.match(contract, /regulatoryCode/);
  assert.match(contract, /acceptance_gate_not_met/);
  assert.match(migration, /decision <> 'accepted'/);
  assert.match(migration, /source_anchor_status = 'stable_page_anchor'/);
  assert.match(migration, /regulatory_code is not null/);
});

test('mapping review stays human-controlled and separate from compliance', () => {
  assert.match(contract, /human_review_only/);
  assert.match(contract, /does not prove legal compliance/);
  assert.match(route, /complianceVerdictCalculated: false/);
  assert.match(route, /operationalMutationExecuted: false/);
});

test('mapping decisions validate current RES 0886 extraction candidates server-side', () => {
  assert.match(contract, /RES_0886_EXTRACTION_CANDIDATES/);
  assert.match(route, /validateRegulatoryMappingDecision/);
  assert.match(route, /candidate\.sourceAnchorStatus/);
  assert.match(route, /candidate\.regulatoryCode/);
});

test('target MOTIL entity is tenant-scoped before review persistence', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /canonical_assets_current/);
  assert.match(route, /hse_facilities/);
  assert.match(route, /entityExists/);
});

test('review storage is backend-only and tenant scoped', () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.motil_regulatory_mapping_reviews from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.motil_regulatory_mapping_reviews to service_role/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
});

test('only authorized HSE or legal editors can persist mapping decisions', () => {
  assert.match(route, /MODULE_KEYS\.HSE_DOCUMENTACION/);
  assert.match(route, /MODULE_KEYS\.HSE_RIESGOS/);
  assert.match(route, /MODULE_KEYS\.LEGAL_MODULO/);
  assert.match(route, /if \(!access\.edit\)/);
});
