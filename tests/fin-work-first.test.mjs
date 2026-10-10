import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('app/dashboard/finanzas/page.tsx','utf8');
test('critical operational area remains visible before secondary metrics',()=>{
assert.ok(source.indexOf('Tesorería')<source.indexOf('data-testid="finance-more-metrics"'));
assert.match(source, /<details data-testid="finance-more-metrics"/);
assert.match(source, /finance\/executive/);
});
