import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const candidates = await readFile(new URL('../lib/intelligence/res0886-stage3-candidates.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/regulatory/installations/route.ts', import.meta.url), 'utf8');
const existing = await readFile(new URL('../lib/intelligence/regulatory-installation-context.ts', import.meta.url), 'utf8');

test('stage3 RES 0886 candidates remain reference-only and cannot be promoted without page anchors', () => {
  assert.match(candidates, /sourceAnchorStatus: 'official_index_only'/);
  assert.match(candidates, /pageAnchorAvailable: false/);
  assert.match(candidates, /mayPromoteToApprovedReference: false/);
  assert.match(candidates, /humanReviewRequired: true/);
  assert.match(candidates, /regulatoryCodeMayBeInvented: false/);
  assert.match(candidates, /sourceMayBeTreatedAsExhaustive: false/);
});

test('stage3 includes concentration and magnetic recovery candidates observed in the official indexed document', () => {
  for (const label of [
    'PLANTA CONCENTRACION',
    'CHANCADO PLANTA DE CONCENTRACION',
    'PLANTA MOLIENDA PLANTA CONCENTRACION',
    'PLANTA FLOTACION PLANTA CONCENTRACION',
    'ESPESADORES PLANTA CONCENTRACION',
    'PLANTA DE FILTROS PLANTA CONCENTRACION',
    'PLANTA RECUPERACION MAGNETICA',
    'CHANCADO PLANTA RECUPERACIÓN MAGNETICA',
    'CONCENTRACION MAGNETICA SECO',
  ]) assert.match(candidates, new RegExp(label));
});

test('approved RES 0886 taxonomy remains empty while stable anchors are missing', () => {
  assert.match(existing, /RES_0886_APPROVED_TAXONOMY:[^=]*= \[\]/);
  assert.match(existing, /sectionHeadingOnlyMayBePromoted: false/);
  assert.match(existing, /missingRegulatoryCodeMayBeInvented: false/);
});

test('installation endpoint exposes stage3 separately from approved context and remains read-only', () => {
  assert.match(route, /stage3Extraction/);
  assert.match(route, /RES_0886_STAGE3_CANDIDATES/);
  assert.match(route, /persistence: 'regulatory_installation_context_v2'/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
});
