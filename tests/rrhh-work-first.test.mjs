import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('app/dashboard/rrhh/operacion/page.tsx','utf8');
test('operational person listing precedes secondary metrics',()=>{
 assert.ok(source.indexOf('Buscar persona') < source.indexOf('data-testid="people-more-metrics"'));
 assert.match(source,/Ver más · Indicadores de personas/);
 assert.match(source,/\/api\/people\/intelligence/);
 assert.match(source,/valid_competency_count/);
});