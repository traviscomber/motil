import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sync=await readFile(new URL('../app/api/legal/cases/sync/route.ts',import.meta.url),'utf8');
const page=await readFile(new URL('../app/dashboard/legal/casos/page.tsx',import.meta.url),'utf8');
const cases=await readFile(new URL('../app/api/legal/cases/route.ts',import.meta.url),'utf8');

test('Legal synchronization writes only under ED and never LEC',()=>{
 assert.match(sync,/getModuleAccessLevel\(context\.userId, context\.role, MODULE_KEYS\.LEGAL_MODULO\)/);
 assert.match(sync,/if \(access !== 'ED'\)/);
 assert.doesNotMatch(sync,/access !== 'ED' && access !== 'LEC'/);
 assert.match(sync,/\.eq\('organization_id', context\.organizationId\)/);
 assert.match(sync,/\.insert\(/);
});
test('read-only Legal users never see nor trigger synchronization',()=>{
 assert.match(page,/if \(data\?\.canWrite\) void sync\(\)/);
 assert.match(page,/data\.canWrite \? <Button/);
 assert.match(page,/Sincronizar/);
 assert.match(cases,/canWrite: auth\.access === 'ED'/);
});
