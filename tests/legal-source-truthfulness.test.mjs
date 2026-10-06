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
  assert.match(page, /Los datos faltantes no se sustituyen por cero ni por estados inferidos/);
  assert.match(page, /No hay señales operacionales pendientes en las fuentes disponibles/);
  assert.doesNotMatch(page, /new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(page, /Cumplimiento.*100%|Cumplimiento.*0%/);

  assert.match(tracker, /endDate: string \| null/);
  assert.match(tracker, /Fecha de término no informada/);
  assert.match(tracker, /if \(leftDays === null\) return 1/);
});


test('legal compliance uses the same canonical legal document source and tenant scope', async () => {
  const contracts = await readFile(new URL('../lib/api/contracts.ts', import.meta.url), 'utf8');
  const documentsApi = await readFile(new URL('../app/api/legal/documentos/route.ts', import.meta.url), 'utf8');

  assert.match(contracts, /from\('module_documents'\)/);
  assert.match(contracts, /eq\('module', 'legal'\)/);
  assert.match(contracts, /user_roles/);
  assert.match(contracts, /maintenance_assets/);
  assert.match(contracts, /expires_at \|\| document\.valid_until/);
  assert.doesNotMatch(contracts, /from\('documents'\)[\s\S]*category.*compliance/);

  assert.match(documentsApi, /auth\.organizationId/);
  assert.match(documentsApi, /ownershipFilters/);
  assert.match(documentsApi, /valid_until/);
  assert.match(documentsApi, /expires_at/);
  assert.match(documentsApi, /expiryDate: doc\.expires_at \|\| doc\.valid_until/);
});
