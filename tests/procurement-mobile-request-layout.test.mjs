import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/procurement/progressive-procurement-workflow.tsx', import.meta.url), 'utf8');

test('new request lines use two columns on mobile and four on wider screens', () => {
  assert.match(source, /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source, /sm:grid-cols-\[auto_minmax\(0,1fr\)_100px_auto\]/);
  assert.match(source, /className="min-w-0"><p className="break-words text-sm font-medium">\{line\.product\.product_code\}/);
});

test('quantity is accessible and its control does not force a mobile overflow', () => {
  assert.match(source, /aria-label=\{`Cantidad de \$\{line\.product\.name\}`\}/);
  assert.match(source, /className="col-start-1 w-full sm:col-auto" type="number"/);
});
