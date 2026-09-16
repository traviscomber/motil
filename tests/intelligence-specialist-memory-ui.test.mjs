import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const widget = fs.readFileSync(new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url), 'utf8');
const popover = fs.readFileSync(new URL('../components/intelligence/controlled-memory-popover.tsx', import.meta.url), 'utf8');

test('maintenance and geology expose the same governed memory control as the core assistants', () => {
  const memoryDomains = widget.slice(widget.indexOf('const controlledMemoryDomains'), widget.indexOf('export function SeniorAssistantMark'));
  assert.match(memoryDomains, /'maintenance'/);
  assert.match(memoryDomains, /'geology'/);
  assert.match(widget, /showsControlledMemory \? <ControlledMemoryPopover \/> : null/);
  assert.match(popover, /maintenance: 'Mantención'/);
  assert.match(popover, /geology: 'Geología'/);
});

test('governed memory UI only changes memory activation metadata', () => {
  assert.match(popover, /action: 'set_active'/);
  assert.match(popover, /active: false/);
  assert.doesNotMatch(popover, /maintenance_work_orders|canonical_inventory_current|production_/);
});
