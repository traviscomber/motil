import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/inventory/workspace.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { formatInventoryQuantity, formatInventoryMoney, inventoryStatusHref } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('missing or invalid inventory values remain unknown rather than becoming zero', () => {
  for (const value of [undefined, null, '', ' ', NaN, Infinity, 'invalid', false, {}]) {
    assert.equal(formatInventoryQuantity(value), '—');
    assert.equal(formatInventoryMoney(value), '—');
  }
});

test('inventory formatting preserves actual zero, negative balances and numeric source strings', () => {
  assert.equal(formatInventoryQuantity(0), '0');
  assert.equal(formatInventoryQuantity('0'), '0');
  assert.equal(formatInventoryQuantity(-1234), '-1.234');
  assert.equal(formatInventoryQuantity('1234'), '1.234');
  assert.equal(formatInventoryMoney(0), new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(0));
});

test('changing inventory status exits the data health queue and preserves other context', () => {
  const href = inventoryStatusHref('status=negative&dataHealth=negative_stock&q=Filtro&context=maintenance', 'reorder');
  const url = new URL(href, 'https://motil.app');
  assert.equal(url.searchParams.get('status'), 'reorder');
  assert.equal(url.searchParams.has('dataHealth'), false);
  assert.equal(url.searchParams.get('q'), 'Filtro');
  assert.equal(url.searchParams.get('context'), 'maintenance');
});

test('returning to all inventory clears both filters without a dangling query', () => {
  assert.equal(inventoryStatusHref('status=negative&dataHealth=negative_stock', 'all'), '/dashboard/bodega');
  assert.equal(inventoryStatusHref('status=reorder&context=maintenance', 'all'), '/dashboard/bodega?context=maintenance');
});
