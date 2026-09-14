import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('lib/intelligence/executive-governed-memory.ts', 'utf8');

test('executive governed memory remains tenant and user scoped', () => {
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.eq\('user_id', context\.userId\)/);
  assert.match(source, /\.eq\('active', true\)/);
});

test('executive governed memory never widens beyond authorized domains', () => {
  assert.match(source, /allowedMemoryDomains\(authorizedDomains/);
  assert.match(source, /EXECUTIVE_MEMORY_DOMAINS\.has\(normalized\)/);
  assert.match(source, /\.in\('domain', domains\)/);
});

test('memory failure is fail-open for canonical reasoning', () => {
  assert.match(source, /available: false/);
  assert.match(source, /promptContext: governedMemoryPrompt\(\[\]\)/);
  assert.match(source, /errorCode: 'memory_unavailable'/);
  assert.doesNotMatch(source, /throw new Error\('memory_unavailable'/);
});

test('memory context remains explicitly non-canonical', () => {
  assert.match(source, /authority: 'non_canonical'/);
  assert.match(source, /governedMemoryPrompt\(memories\)/);
});
