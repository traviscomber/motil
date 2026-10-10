import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/legal/page.tsx', import.meta.url);
const trackerUrl = new URL('../components/legal/contracts-tracker.tsx', import.meta.url);

test('legal overview preserves source uncertainty and never fabricates operational state', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const tracker = await readFile(trackerUrl, 'utf8');

  assert.match(page, /if \(!response\.ok\) throw new Error/);
  assert.match(page, /contracts_pending_review \?\? '—'/);
  assert.match(page, /expiring_contracts \?\? '—'/);
  assert.match(page, /expiring_documents \?\? '—'/);
  assert.match(page, /withMatchedEvidence \?\? '—'/);
  assert.match(page, /complianceLoading \|\| complianceError \? '—'/);
  assert.match(page, /attentionLoading \? /);
  assert.match(page, /complianceError \? /);
  assert.match(page, /Sin contratos ni documentos pendientes en esta fuente/);
  assert.doesNotMatch(page, /new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(page, /Cumplimiento.*100%|Cumplimiento.*0%/);

  assert.match(tracker, /endDate: string \| null/);
  assert.match(tracker, /Fecha de término no informada/);
  assert.match(tracker, /if \(leftDays === null\) return 1/);
});
