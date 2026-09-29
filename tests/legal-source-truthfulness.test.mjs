import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/legal/page.tsx', import.meta.url);
const trackerUrl = new URL('../components/legal/contracts-tracker.tsx', import.meta.url);

test('legal summary does not fabricate zero compliance or current dates when evidence is missing', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const tracker = await readFile(trackerUrl, 'utf8');

  assert.match(page, /if \(!summary\) return null/);
  assert.match(page, /compliancePercent === null \? '—'/);
  assert.match(page, /summary \? summary\.active_contracts : '—'/);
  assert.match(page, /startDate: contract\.start_date \|\| null/);
  assert.match(page, /endDate: contract\.end_date \|\| null/);
  assert.doesNotMatch(page, /new Date\(\)\.toISOString\(\)/);
  assert.match(page, /Documentos no disponibles/);
  assert.match(page, /Contratos no disponibles/);
  assert.match(page, /Cumplimiento no disponible/);

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
