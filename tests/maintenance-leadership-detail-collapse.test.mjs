import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');

test('leadership OT detail prioritizes evidence and approval over technical noise', () => {
  assert.match(detail, /viewer\?\.mode === 'leadership'/);
  assert.match(detail, /<WorkOrderEvidenceAndApproval workOrderId=\{id\} status=\{workOrder\.status\} \/>/);
  assert.match(detail, /Ver información de la OT/);
  assert.match(detail, /Ver plan, materiales e historial/);
});

test('leadership OT detail does not expose warehouse delivery catalog', () => {
  const start = detail.indexOf("if (viewer?.mode === 'leadership'");
  const end = detail.indexOf('return <div className="space-y-6">', start);
  const leadership = detail.slice(start, end);
  assert.doesNotMatch(leadership, /WorkOrderPartsPanel/);
  assert.doesNotMatch(leadership, /WorkOrderExecutionPanel/);
});
