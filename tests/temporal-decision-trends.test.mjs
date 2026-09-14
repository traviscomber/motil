import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const helper = fs.readFileSync('lib/intelligence/temporal-decision-trends.ts', 'utf8');
const route = fs.readFileSync('app/api/intelligence/decision-cases/trends/route.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260914124500_add_decision_case_temporal_events.sql', 'utf8');

test('temporal v2 derives directional labels only from explicit snapshots', () => {
  assert.match(helper, /'improved'/);
  assert.match(helper, /'worsened'/);
  assert.match(helper, /'unchanged'/);
  assert.match(helper, /'recurred'/);
  assert.match(helper, /missing_evidence/);
  assert.match(helper, /contradictions/);
  assert.match(helper, /evidence_refs/);
  assert.match(helper, /previously resolved\/closed case becomes active again/);
  assert.match(helper, /not business impact or root cause/);
});

test('temporal event ledger is append-only from decision case lifecycle trigger', () => {
  assert.match(migration, /motil_ai_decision_case_events/);
  assert.match(migration, /after insert or update on public\.motil_ai_decision_cases/);
  assert.match(migration, /before_state jsonb/);
  assert.match(migration, /after_state jsonb not null/);
  assert.doesNotMatch(migration, /delete from public\.motil_ai_decision_cases/);
});

test('trends endpoint remains tenant user permission scoped and read only', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(route, /filterAccessibleDecisionCaseDomains/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /operationalMutationExecuted: false/);
});
