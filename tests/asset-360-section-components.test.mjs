import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overview = fs.readFileSync('components/maintenance/asset-360-overview.tsx', 'utf8');
const format = fs.readFileSync('components/maintenance/asset-360/format.ts', 'utf8');
const primitives = fs.readFileSync('components/maintenance/asset-360/primitives.tsx', 'utf8');

test('asset 360 format helpers live in the shared format module', () => {
  assert.match(format, /export const number = \(value: unknown, digits = 0\)/);
  assert.match(format, /export const money = \(value: unknown\)/);
  assert.match(format, /'Sin base'/);
  assert.match(format, /export const show = \(value: unknown\)/);
  assert.match(format, /'No informado'/);
  assert.match(format, /export const date = \(value: unknown\)/);
  assert.match(format, /es-CL', \{ dateStyle: 'medium' \}/);
  assert.match(format, /export const cleanEvidenceText = \(value: unknown\)/);
  assert.match(format, /'#ERROR!', 'NO REGISTRADO', 'N\/A', 'SIN ASIGNAR', 'NO ASIGNADO', 'DESCONOCIDO', '-'/);
});

test('asset 360 presentation primitives live in the shared primitives module', () => {
  assert.match(primitives, /export function IdentityItem\(/);
  assert.match(primitives, /icon: LucideIcon/);
  assert.match(primitives, /value: unknown/);
  assert.match(primitives, /export function SectionSummary\(/);
  assert.match(primitives, /title: string/);
  assert.match(primitives, /hint\?: string \| null/);
  assert.match(primitives, /Ver detalle/);
  assert.match(primitives, /group-open:rotate-180/);
});

test('asset 360 overview imports the shared helpers instead of defining them', () => {
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/format'/);
  assert.match(overview, /from '@\/components\/maintenance\/asset-360\/primitives'/);
  assert.match(overview, /cleanEvidenceText,/);
  assert.match(overview, /IdentityItem, SectionSummary/);
  assert.doesNotMatch(overview, /const number = \(value: unknown/);
  assert.doesNotMatch(overview, /const money = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const show = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const date = \(value: unknown\)/);
  assert.doesNotMatch(overview, /const cleanEvidenceText = \(value: unknown\)/);
  assert.doesNotMatch(overview, /function IdentityItem\(/);
  assert.doesNotMatch(overview, /function SectionSummary\(/);
});

test('asset 360 overview still renders through the shared primitives', () => {
  assert.match(overview, /<IdentityItem[ \n]/);
  assert.match(overview, /<SectionSummary[ \n]/);
  assert.match(overview, /number\(/);
  assert.match(overview, /money\(/);
  assert.match(overview, /date\(/);
  assert.match(overview, /cleanEvidenceText\(/);
});
