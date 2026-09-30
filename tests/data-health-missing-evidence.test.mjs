import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/data-quality/health/route.ts', import.meta.url);

test('data health never converts missing production evidence into zero-day healthy freshness', async () => {
  const source = await readFile(apiUrl, 'utf8');

  assert.match(source, /productionWorstAge = productionAges\.length \? Math\.max\(\.\.\.productionAges\) : null/);
  assert.match(source, /productionMissingFreshness = productionFreshness\.some\(\(value\) => value === null\)/);
  assert.match(source, /!productionHasEvidence\s*\? 'unknown'/s);
  assert.match(source, /Sin checks canónicos evaluables/);
  assert.doesNotMatch(source, /Math\.max\(\.\.\.productionFreshness\.filter[\s\S]*, 0\)/);
});

test('empty maintenance inventory and procurement evidence remain unknown instead of healthy', async () => {
  const source = await readFile(apiUrl, 'utf8');

  assert.match(source, /allWorkOrders\.length === 0\s*\? 'unknown'/s);
  assert.match(source, /!inventoryHasOverview \|\| inventoryAge === null\s*\? 'unknown'/s);
  assert.match(source, /poRows\.length === 0\s*\? 'unknown'/s);
  assert.match(source, /Sin evidencia suficiente para acreditar la salud del inventario/);
  assert.match(source, /Sin OC evaluables para acreditar calidad de Compras/);
});


test('HSE Legal and Finance keep absent evidence unknown and preserve source gaps', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /canonicalDocs\.length === 0[\s\S]*\? 'unknown'/);
  assert.match(source, /normalizationGaps > 0[\s\S]*\? 'watch'/);
  assert.match(source, /cases\.length === 0[\s\S]*\? 'unknown'/);
  assert.match(source, /missingSource > 0 \|\| missingDeadline > 0[\s\S]*\? 'critical'/);
  assert.match(source, /payables\.length === 0[\s\S]*\? 'unknown'/);
  assert.match(source, /Completar vencimiento desde la factura o evidencia financiera; no inferirlo/);
});
