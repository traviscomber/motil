import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const evidence = await readFile(new URL('../components/maintenance/work-order-evidence-and-approval.tsx', import.meta.url), 'utf8');

test('supervisor approval action stays beside visible evidence', () => {
  assert.match(evidence, /status === 'completed' && canApprove && photos\.length > 0/);
  assert.match(evidence, /Aprobar OT/);
  assert.match(evidence, /OT aprobada/);
});

test('pending approval does not render a second large approval card for supervisors', () => {
  const count = (evidence.match(/<Card className="shadow-none">/g) || []).length;
  assert.equal(count, 1);
});
