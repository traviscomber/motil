import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lib = fs.readFileSync('lib/maintenance/evidence-field-resolution.ts', 'utf8');

test('evidence field resolution picks the first candidate with a usable value', () => {
  assert.match(lib, /export function resolveEvidenceField/);
  assert.match(lib, /for \(const candidate of candidates\)/);
  assert.match(lib, /if \(candidate\.value\)/);
  assert.match(lib, /return \{ value: candidate\.value, source: candidate\.source, at: candidate\.at \?\? null \}/);
});

test('evidence field resolution returns null provenance when no candidate is usable', () => {
  assert.match(lib, /return \{ value: null, source: null, at: null \}/);
});

test('evidence field resolution declares explicit value source and optional timestamp', () => {
  assert.match(lib, /export type EvidenceFieldCandidate/);
  assert.match(lib, /value: string \| null \| undefined/);
  assert.match(lib, /source: string/);
  assert.match(lib, /at\?: string \| null/);
});

test('evidence field resolution never invents evidence', () => {
  assert.doesNotMatch(lib, /fetch\(|supabase|Math\.random|Date\.now|new Date/);
});
