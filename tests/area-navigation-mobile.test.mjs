import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/ui/area-navigation.tsx', import.meta.url), 'utf8');

test('area navigation stays on one row with horizontally scrollable primary links', () => {
  assert.match(source, /flex min-w-0 items-center gap-1 border-b/);
  assert.match(source, /overflow-x-auto overscroll-x-contain/);
  assert.match(source, /min-h-11 shrink-0 items-center whitespace-nowrap/);
});

test('the secondary navigation menu remains alongside the scrollable links', () => {
  assert.match(source, /<\/div>\s*\{secondary\.length \? \(/);
  assert.match(source, /DropdownMenuTrigger asChild/);
  assert.match(source, /min-h-11 shrink-0 gap-2 text-sm/);
});
