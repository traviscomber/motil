import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scoreUrl = new URL('../lib/intelligence/decision-attention.ts', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/decision-cases/prioritized/route.ts', import.meta.url);
const homeUrl = new URL('../components/dashboard/home-decision-priorities.tsx', import.meta.url);

const score = await readFile(scoreUrl, 'utf8');
const route = await readFile(routeUrl, 'utf8');
const home = await readFile(homeUrl, 'utf8');

test('attention scoring is deterministic and explainable without LLM inference', () => {
  assert.match(score, /export function deriveDecisionAttention/);
  assert.match(score, /factors: AttentionFactor\[\]/);
  assert.doesNotMatch(score, /OpenAI|responses|chat\.completions|generateText|streamText/);
  assert.match(score, /source_severity/);
  assert.match(score, /workflow_blocker/);
  assert.match(score, /supply_blocker/);
});

test('critical explicit source severity can reach P1 while warning volume alone cannot', () => {
  assert.match(score, /\? 45/);
  assert.match(score, /warning', 'warn'\]\.includes\(severity\)[\s\S]*?\? 10/);
  assert.match(score, /operational:finance:alert:[\s\S]*?score \+= 8/);
  assert.match(score, /score >= 65 \? 'P1' : score >= 40 \? 'P2' : 'P3'/);
});

test('missing evidence increases validation need only minimally', () => {
  assert.match(score, /Math\.min\(3, missing\)/);
  assert.match(score, /aumenta necesidad de validación, no impacto/);
});

test('prioritized endpoint remains tenant user and permission scoped', () => {
  assert.match(route, /getOrganizationContext/);
  assert.match(route, /filterAccessibleDecisionCaseDomains/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(route, /\.in\('target_domain', Array\.from\(visibleDomains\)\)/);
  assert.doesNotMatch(route, /\.(insert|update|delete|upsert)\(/);
});

test('prioritized endpoint ranks by derived score and caps the requested surface', () => {
  assert.match(route, /deriveDecisionAttention/);
  assert.match(route, /b\.attention\.score - a\.attention\.score/);
  assert.match(route, /Math\.min\(20, Math\.max\(1/);
});

test('home consumes the top three prioritized cases across authorized domains', () => {
  assert.match(home, /\/api\/intelligence\/decision-cases\/prioritized\?limit=3/);
  assert.doesNotMatch(home, /targetDomains=maintenance,geology/);
  for (const domain of ['maintenance', 'geology', 'inventory', 'procurement', 'production', 'finance', 'hse']) {
    assert.match(home, new RegExp(`${domain}:`));
  }
  assert.match(home, /Por qué importa:/);
  assert.match(home, /item\.attention\.level/);
});
