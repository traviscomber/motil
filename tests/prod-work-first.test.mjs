import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('components/dashboard/produccion-dashboard.tsx','utf8');
test('critical operational area remains visible before secondary metrics',()=>{
assert.ok(source.indexOf('Qué requiere atención')<source.indexOf('data-testid="production-more-metrics"'));
assert.match(source, /<details data-testid="production-more-metrics"/);
assert.match(source, /canonical-overview/);
});
