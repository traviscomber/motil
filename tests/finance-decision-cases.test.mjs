import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const financeUrl = new URL('../lib/intelligence/finance-decision-cases.ts', import.meta.url);
const syncUrl = new URL('../app/api/intelligence/decision-cases/sync/route.ts', import.meta.url);

const finance = await readFile(financeUrl, 'utf8');
const sync = await readFile(syncUrl, 'utf8');

test('finance cases derive only from tenant scoped canonical finance alerts', () => {
  assert.match(finance, /from\('canonical_finance_alerts'\)/);
  assert.match(finance, /\.eq\('organization_id', organizationId\)/);
  assert.match(finance, /\.gt\('exception_count', 0\)/);
  assert.doesNotMatch(finance, /from\('canonical_finance_alerts'\)\s*\.update/);
});

test('finance cases remain advisory and do not overclaim impact', () => {
  assert.match(finance, /No demuestra por sí sola pérdida económica, fraude, incumplimiento contable ni impacto operacional/);
  assert.match(finance, /operational:finance:alert:/);
  assert.match(sync, /financeDecisionCandidates/);
  assert.match(sync, /isFinanceDecisionResolved/);
  assert.match(sync, /financeAllowed/);
});

test('finance resolution is exact against the same canonical alert code', () => {
  assert.match(finance, /\.eq\('alert_code', alertCode\)/);
  assert.match(finance, /Number\(data\.exception_count \|\| 0\) <= 0/);
});

test('decision sync explicitly preserves finance as read only', () => {
  assert.match(sync, /no modifica datos financieros/i);
  assert.match(sync, /finance: financeAllowed/);
  assert.doesNotMatch(sync, /from\('canonical_finance_alerts'\)\s*\.update/);
});
