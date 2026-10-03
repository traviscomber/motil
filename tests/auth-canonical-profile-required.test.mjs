import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../lib/api/auth-session.ts', import.meta.url), 'utf8');

test('raw Supabase identities without a canonical profile fail closed', () => {
  assert.match(source, /if \(!profile\) \{\s*return \{ authUserId, active: false \};\s*\}/);
});

test('Supabase sessions require an active canonical application profile', () => {
  assert.match(source, /identity\.active !== true \|\| !identity\.applicationUserId/);
  assert.doesNotMatch(source, /identity\.applicationUserId \|\| user\.id/);
});

test('custom compatibility sessions also require a resolved canonical profile', () => {
  const occurrences = source.match(/identity\.active !== true \|\| !identity\.applicationUserId/g) ?? [];
  assert.ok(occurrences.length >= 2);
  assert.doesNotMatch(source, /identity\.applicationUserId \|\| customSession\.user\.id/);
});
