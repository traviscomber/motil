import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);

test('maintenance assistant falls back to canonical evidence when AI credits are unavailable', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /isRecoverableAiAvailabilityError/);
  assert.match(route, /canonicalFallbackAnswer/);
  assert.match(route, /canonical-fallback/);
  assert.match(route, /AI unavailable; using canonical fallback/);
});

test('canonical fallback answers Ficha 360 data coverage questions', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /ficha\\s\*360/);
  assert.match(route, /cobertura 6\/6|cobertura/);
  assert.match(route, /No es un score de confiabilidad, criticidad ni condición mecánica/);
  assert.match(route, /get_asset_context_batch/);
});
