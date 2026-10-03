import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const healthUrl = new URL('../app/api/maintenance/senior-assistant/health/route.ts', import.meta.url);
const bodyUrl = new URL('../components/intelligence/specialist-assistant-body.tsx', import.meta.url);
const contextUrl = new URL('../lib/intelligence/assistant-context.ts', import.meta.url);
const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);

test('maintenance assistant falls back to canonical evidence when AI availability fails', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /isRecoverableAiAvailabilityError/);
  assert.match(route, /canonicalFallbackAnswer/);
  assert.match(route, /canonical-fallback/);
  assert.match(route, /get_maintenance_attention_context/);
  assert.match(route, /DATO CANÓNICO/);
  assert.match(route, /PRÓXIMA ACCIÓN/);
});

test('assistant health remains operational in canonical fallback mode', async () => {
  const health = await readFile(healthUrl, 'utf8');
  assert.match(health, /canonicalFallback/);
  assert.match(health, /degraded/);
  assert.match(health, /mode: 'canonical_fallback'/);
});

test('maintenance assistant UI exposes resilient runtime mode and daily-work prompts', async () => {
  const [body, context, widget] = await Promise.all([
    readFile(bodyUrl, 'utf8'),
    readFile(contextUrl, 'utf8'),
    readFile(widgetUrl, 'utf8'),
  ]);
  assert.match(body, /Modo canónico/);
  assert.match(body, /IA \+ canónico/);
  assert.match(body, /IA generativa no está disponible/);
  assert.match(context, /5 acciones de mantenimiento/);
  assert.match(context, /OT están bloqueadas/);
  assert.match(widget, /get_maintenance_attention_context: 'Atención \+ contexto'/);
});
