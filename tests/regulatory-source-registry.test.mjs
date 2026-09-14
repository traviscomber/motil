import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registryPath = new URL('../lib/intelligence/regulatory-sources.ts', import.meta.url);
const routePath = new URL('../app/api/intelligence/regulatory/sources/route.ts', import.meta.url);

const registry = await readFile(registryPath, 'utf8');
const route = await readFile(routePath, 'utf8');

test('regulatory registry keeps SERNAGEOMIN knowledge separate from operational truth', () => {
  assert.match(registry, /Regulatory knowledge describes requirements, structures and expected evidence\. It never proves site compliance\./);
  assert.match(registry, /No regulatory source may overwrite canonical operational truth or company identifiers\./);
  assert.match(registry, /never_overwrite_company_identifiers/);
});

test('RES 0886 stays pending until exact taxonomy is extracted and human reviewed', () => {
  assert.match(registry, /sernageomin-res-0886-2025/);
  assert.match(registry, /taxonomyStatus: 'pending_exact_extraction'/);
  assert.match(registry, /reviewPolicy: 'human_review_required'/);
  assert.doesNotMatch(registry, /taxonomyStatus: 'approved'/);
});

test('registry exposes official source provenance and domains', () => {
  assert.match(registry, /https:\/\/www\.sernageomin\.cl\/mineria\//);
  assert.match(registry, /https:\/\/www\.sernageomin\.cl\/seguridad-minera\//);
  assert.match(registry, /https:\/\/www\.sernageomin\.cl\/formularios-seguridad-minera\//);
  assert.match(registry, /lastReviewedAt/);
  assert.match(registry, /versionOrResolution/);
});

test('regulatory source API is read only and cannot mutate operations', () => {
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.delete\(/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /authority: 'reference_only'/);
});
