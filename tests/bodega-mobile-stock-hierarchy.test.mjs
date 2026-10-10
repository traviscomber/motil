import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/dashboard/bodega/page.tsx', import.meta.url), 'utf8');

test('mobile rows prioritize product name while keeping code accessible', () => {
  assert.match(source, /order-1 min-w-0 lg:order-none/);
  assert.match(source, /break-words font-medium group-hover:text-primary/);
  assert.match(source, /order-2 min-w-0 font-mono text-xs text-muted-foreground/);
});

test('stock and state follow product identity on narrow screens', () => {
  assert.match(source, /order-3 text-sm font-medium tabular-nums/);
  assert.match(source, /order-4 justify-self-start lg:order-none/);
  assert.match(source, /aria-label="Buscar productos en inventario"/);
});
