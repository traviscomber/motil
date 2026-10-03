import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../lib/auth-cookie.ts', import.meta.url), 'utf8');

test('auth cookie creation fails closed without a signing secret', () => {
  assert.match(source, /throw new Error\('Missing auth cookie signing secret'\)/);
  assert.doesNotMatch(source, /return JSON\.stringify\(payload\)/);
});

test('auth cookie verification rejects unsigned legacy payloads', () => {
  assert.match(source, /if \(!secret\) \{\s*return null;\s*\}/);
  assert.doesNotMatch(source, /legacyPayload/);
});
