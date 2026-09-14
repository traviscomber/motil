import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const library = fs.readFileSync('lib/intelligence/regulatory-installation-context.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/regulatory/installations/route.ts', 'utf8');

test('RES 0886 approved taxonomy stays empty until stable official anchors and human review', () => {
  assert.match(library, /RES_0886_APPROVED_TAXONOMY:[\s\S]*= \[\]/);
  assert.match(library, /officialSourceRequired: true/);
  assert.match(library, /sourceAnchorRequired: true/);
  assert.match(library, /humanReviewRequired: true/);
  assert.match(library, /partialExtractionMayBePublishedAsApproved: false/);
  assert.match(library, /sectionHeadingOnlyMayBePromoted: false/);
  assert.match(library, /missingRegulatoryCodeMayBeInvented: false/);
});

test('verified official excerpts may be staged only as pending human-review candidates', () => {
  assert.match(library, /RES_0886_EXTRACTION_CANDIDATES/);
  assert.match(library, /regulatoryLabel: 'MINA SUBTERRANEA'/);
  assert.match(library, /regulatoryLabel: 'BOTADERO DE ESCORIA'/);
  assert.match(library, /regulatoryLabel: 'BOTADERO DE ESTERIL'/);
  assert.match(library, /regulatoryLabel: 'RIPIOS DE LIXIVIACIÓN'/);
  assert.match(library, /'ACOPIO DE MINERAL'/);
  assert.match(library, /'CAMINOS'/);
  assert.match(library, /sourceAnchorStatus: 'section_heading_only'/);
  assert.match(library, /reviewStatus: 'pending_human_review'/);
  assert.match(library, /regulatoryCode: null/);
});

test('regulatory installation context cannot overwrite operational truth or prove compliance', () => {
  assert.match(library, /never_overwrite_company_identifiers/);
  assert.match(library, /taxonomy_mapping_does_not_prove_compliance/);
  assert.match(library, /operationalMutation: false/);
});

test('regulatory installation endpoint is reference-only and read-only', () => {
  assert.match(route, /export async function GET\(\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /authority: 'reference_only'/);
  assert.match(route, /operationalMutationExecuted: false/);
});
