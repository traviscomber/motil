import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/evidence/route.ts', import.meta.url), 'utf8');
const queue = await readFile(new URL('../components/maintenance/progressive-work-order-close-queue.tsx', import.meta.url), 'utf8');

test('OT evidence route supports signed direct uploads without weakening authorization', () => {
  assert.match(route, /createSignedUploadUrl/);
  assert.match(route, /complete_upload/);
  assert.match(route, /requireAssignedMaintenanceExecution/);
  assert.match(route, /requireOperationalMaintenanceWorkOrder/);
  assert.match(route, /storagePath\.startsWith\(expectedPrefix\)/);
  assert.match(route, /execution_evidence_added/);
  assert.doesNotMatch(route, /EVIDENCE_TAGS/);
});

test('close queue uploads photo directly to Supabase Storage', () => {
  assert.match(queue, /uploadToSignedUrl/);
  assert.match(queue, /action: 'create_upload'/);
  assert.match(queue, /action: 'complete_upload'/);
  assert.match(queue, /multiple/);
  assert.match(queue, /await Promise\.all\(\[mutateEvidence\(\), mutate\(\)\]\)/);
});
