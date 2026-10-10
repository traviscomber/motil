import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const s=await readFile('app/dashboard/sostenibilidad/page.tsx','utf8');
test('HSE area actions precede optional indicators',()=>{
 assert.ok(s.indexOf('sustainability-areas')<s.indexOf('data-testid="hse-more-metrics"'));
 assert.match(s,/Ver más · Indicadores HSE/);
 assert.match(s,/Resumen HSE no disponible/);
 assert.match(s,/\/dashboard\/sostenibilidad\/no-conformidades/);
});