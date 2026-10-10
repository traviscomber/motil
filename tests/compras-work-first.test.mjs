import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile('app/dashboard/compras/page.tsx','utf8');
test('procurement pipeline appears before supporting KPIs', () => {
 assert.ok(source.indexOf('id="compras-pendientes"') < source.indexOf('data-testid="compras-more-context"'));
 assert.match(source,/Ver más · Indicadores y accesos/);
 assert.ok(source.indexOf('<OperationalPipelineBoard />') < source.indexOf('aria-label="Resumen de Compras"'));
});
test('procurement keeps canonical overview, errors and explicit primary action', () => {
 assert.match(source,/\/api\/procurement\/overview/);
 assert.match(source,/Resumen de Compras no disponible/);
 assert.match(source,/Nueva compra/);
 assert.match(source,/\/dashboard\/compras\/flujo/);
});