import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/navigation-access.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { canNavigateTo, activeNavigationHref } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('canonical module access determines navigation even when legacy roles differ', () => {
  const item = { href: '/dashboard/bodega', roles: ['Bodega-Supervisor'], moduleKey: 'bodega_inventario' };
  assert.equal(canNavigateTo(item, 'viewer', true, key => key === 'bodega_inventario'), true);
  assert.equal(canNavigateTo(item, 'Bodega-Supervisor', true, () => false), false);
  assert.equal(canNavigateTo(item, null, true, () => true), false);
});

test('legacy navigation retains role checks and operational manager boundaries', () => {
  const item = { href: '/dashboard/bodega', roles: ['Bodega-Supervisor'], group: 'areas' };
  assert.equal(canNavigateTo(item, 'viewer', false, () => true), false);
  assert.equal(canNavigateTo(item, 'admin', false, () => false), true);
  assert.equal(canNavigateTo(item, 'gerente_operaciones', false, () => false), true);
  assert.equal(canNavigateTo({ ...item, group: 'admin' }, 'gerente_operaciones', false, () => true), false);
});

test('only the deepest available navigation destination is active', () => {
  const items = [{ href: '/dashboard' }, { href: '/dashboard/produccion' }, { href: '/dashboard/produccion/geologia' }];
  assert.equal(activeNavigationHref('/dashboard', items), '/dashboard');
  assert.equal(activeNavigationHref('/dashboard/produccion/geologia/informe', items), '/dashboard/produccion/geologia');
  assert.equal(activeNavigationHref('/dashboard/produccion/geologia', items.slice(0, 2)), '/dashboard/produccion');
  assert.equal(activeNavigationHref('/dashboard/produccion-extra', items), undefined);
  assert.deepEqual(items.map(item => item.href), ['/dashboard', '/dashboard/produccion', '/dashboard/produccion/geologia']);
});
