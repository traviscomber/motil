import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/dashboard/finanzas/page.tsx', import.meta.url), 'utf8');

test('supplier names stay readable without truncation', () => {
  assert.match(source, /min-w-0 break-words text-sm font-medium">\{String\(row\.supplier_name \|\| 'Proveedor'\)\}/);
});

test('concentration labels stay readable without truncation', () => {
  assert.match(source, /min-w-0 break-words text-sm font-medium">\{String\(row\[config\.labelKey\] \|\| 'Sin identificar'\)\}/);
});
