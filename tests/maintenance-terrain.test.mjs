import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { deriveKey, seal, unseal, packageId, canUseOffline, acknowledge, assertOwner, validatePin } from '../public/motil-terrain.mjs';

test('field package encryption survives reload, rejects wrong PIN, tampering and swapped identity', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey('18274639', salt);
  const id = await packageId('org:person', 'order');
  const data = { scope: 'org:person', title: 'Private OT', draft: 'Observación', photos: [{ id: 'photo', dataUrl: 'data:image/jpeg;base64,abc' }], notes: [{ id: 'note' }], expiresAt: Date.now() + 60000 };
  const stored = structuredClone(await seal(data, key, salt, id));
  assert.equal('title' in stored, false);
  assert.equal('scope' in stored, false);
  assert.deepEqual((await unseal(stored, '18274639')).data, data);
  await assert.rejects(unseal(stored, '00000000'));
  const changed = structuredClone(stored); new Uint8Array(changed.cipher)[0] ^= 1;
  await assert.rejects(unseal(changed, '18274639'));
  await assert.rejects(unseal({ ...stored, id: 'other-record' }, '18274639'));
  assert.notEqual(id, await packageId('org:other-person', 'order'));
});

test('expiration denies further offline work without deleting pending records', () => {
  const data = { expiresAt: 100, notes: [{ id: 'n1' }] };
  assert.equal(canUseOffline(data, 99), true);
  assert.equal(canUseOffline(data, 100), false);
  assert.equal(canUseOffline({}, 99), false);
  assert.equal(data.notes.length, 1);
  assert.throws(() => assertOwner({ scope: 'org:a' }, 'org:b'));
  assert.doesNotThrow(() => assertOwner({ scope: 'org:a' }, 'org:a'));
  assert.throws(() => validatePin('1234'));
});

test('only acknowledged operations leave the outbox; retry preserves IDs and other records', () => {
  const data = { draft: 'new draft', notes: [{ id: 'n1' }, { id: 'n2' }], photos: [{ id: 'p1' }] };
  const next = acknowledge(data, 'notes', 'n1');
  assert.deepEqual(next.notes, [{ id: 'n2' }]);
  assert.deepEqual(next.photos, data.photos);
  assert.equal(next.draft, data.draft);
  assert.deepEqual(acknowledge(next, 'notes', 'n1'), next);
  assert.equal(data.notes.length, 2);
});

test('service worker executes and recovers only maintenance navigation/static shell, never APIs', async () => {
  const handlers = {};
  const cacheLookups = [];
  const shell = { marker: 'offline-shell' };
  const context = { URL, Set, Response, self: { location: { origin: 'https://motil.test' }, addEventListener: (type, fn) => { handlers[type] = fn; } }, caches: { open: async () => ({ match: async path => { cacheLookups.push(path); return shell; } }) }, fetch: async () => { throw new Error('offline'); } };
  vm.runInNewContext(readFileSync('public/motil-sw-v2.js', 'utf8'), context);
  for (const path of ['/dashboard', '/dashboard/mantenimiento', '/dashboard/mantenimiento/ordenes-trabajo', '/dashboard/mantenimiento/ordenes-trabajo/12345678-1234-1234-1234-123456789abc']) {
    let response;
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: `https://motil.test${path}` }, respondWith: value => { response = value; } });
    assert.equal(await response, shell);
  }
  const count = cacheLookups.length;
  let apiResponse;
  handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://motil.test/api/maintenance/work-orders' }, respondWith: value => { apiResponse = value; } });
  await assert.rejects(apiResponse);
  assert.equal(cacheLookups.length, count);
});

test('terrain preparation rejects unauthenticated, unassigned and historical orders before reading a snapshot', async () => {
  const ts = await import('typescript');
  const code = ts.default.transpileModule(readFileSync('app/api/maintenance/work-orders/[id]/terrain/route.ts', 'utf8'), { compilerOptions: { module: ts.default.ModuleKind.CommonJS, target: ts.default.ScriptTarget.ES2022 } }).outputText;
  for (const blocked of ['session', 'assignment', 'historical']) {
    let reads = 0;
    const response = { status: 403 };
    const org = { ok: blocked !== 'session', response, supabase: { from() { reads++; throw new Error('Unexpected query'); } } };
    const dependencies = {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/api/organization-context': { getOrganizationContext: async () => org },
      '@/lib/maintenance/work-order-execution-access': { requireAssignedMaintenanceExecution: async () => ({ ok: blocked !== 'assignment', response }) },
      '@/lib/maintenance/work-order-scope': { requireOperationalMaintenanceWorkOrder: async () => ({ ok: blocked !== 'historical', status: 409, error: 'historical' }) },
    };
    const exports = {};
    vm.runInNewContext(code, { exports, require: name => dependencies[name] });
    const result = await exports.GET({}, { params: Promise.resolve({ id: 'order' }) });
    assert.equal(result.status, blocked === 'historical' ? 409 : 403);
    assert.equal(reads, 0);
  }
});

test('terrain snapshot stays tenant scoped, bounded, read-only and excludes private fields', async () => {
  const ts = await import('typescript');
  const code = ts.default.transpileModule(readFileSync('app/api/maintenance/work-orders/[id]/terrain/route.ts', 'utf8'), { compilerOptions: { module: ts.default.ModuleKind.CommonJS, target: ts.default.ScriptTarget.ES2022 } }).outputText;
  const filters = [];
  const query = { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, maybeSingle: async () => ({ data: { title: 'x'.repeat(400), description: 'y'.repeat(9000), status: 'open', work_order_number: 'OT1', private_salary: 999 } }) };
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200, headers: options?.headers }) } },
    '@/lib/api/organization-context': { getOrganizationContext: async () => ({ ok: true, organizationId: 'org', userId: 'person', supabase: { from: () => query } }) },
    '@/lib/maintenance/work-order-execution-access': { requireAssignedMaintenanceExecution: async () => ({ ok: true }) },
    '@/lib/maintenance/work-order-scope': { requireOperationalMaintenanceWorkOrder: async () => ({ ok: true }) },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name] });
  const result = await exports.GET({}, { params: Promise.resolve({ id: 'order' }) });
  assert.equal(result.status, 200);
  assert.deepEqual(filters, [['organization_id', 'org'], ['id', 'order']]);
  assert.equal(result.body.title.length, 300);
  assert.equal(result.body.instructions.length, 8000);
  assert.equal(result.body.scope, 'org:person');
  assert.equal('private_salary' in result.body, false);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
