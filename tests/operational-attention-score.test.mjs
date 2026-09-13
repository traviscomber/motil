import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scoreUrl = new URL('../lib/intelligence/operational-attention-score.ts', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/attention/route.ts', import.meta.url);
const score = await readFile(scoreUrl, 'utf8');
const route = await readFile(routeUrl, 'utf8');

test('attention score is deterministic and refuses unsupported inference', () => {
  assert.match(score, /Factores sin evidencia aportan 0/i);
  assert.match(score, /no se infiere urgencia/i);
  assert.match(score, /no estima probabilidad, costo, seguridad ni causa raíz/i);
  assert.match(score, /Math\.min\(100/);
});

test('attention score exposes explicit factors and P1 P2 P3 levels', () => {
  assert.match(score, /'impact' \| 'urgency' \| 'blocking' \| 'uncertainty' \| 'evidence'/);
  assert.match(score, /score >= 60 \? 'P1' : score >= 35 \? 'P2' : 'P3'/);
});

test('attention API remains tenant user and permission scoped', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(route, /filterAccessibleDecisionCaseDomains/);
  assert.match(route, /hiddenByCurrentPermissions/);
});

test('attention API ranks without mutating operational truth', () => {
  assert.match(route, /assessOperationalAttention/);
  assert.match(route, /b\.attention\.score - a\.attention\.score/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.delete\(/);
});
