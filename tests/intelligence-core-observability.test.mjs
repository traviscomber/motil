import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260914102000_add_ai_core_run_observability.sql', import.meta.url), 'utf8');
const evaluation = await readFile(new URL('../lib/intelligence/core-evaluation.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/intelligence/evaluation/recent/route.ts', import.meta.url), 'utf8');

test('core observability is append-only from assistant messages and backend-only', () => {
  assert.match(migration, /motil_ai_core_runs/);
  assert.match(migration, /after insert on public\.motil_ai_messages/);
  assert.match(migration, /when \(new\.role = 'assistant'\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.motil_ai_core_runs from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.motil_ai_core_runs to service_role/);
});

test('core run ledger records trace and latency without duplicating answer content', () => {
  assert.match(migration, /source_refs jsonb/);
  assert.match(migration, /latency_ms integer/);
  assert.match(migration, /response_char_count integer/);
  assert.match(migration, /response_message_id uuid not null unique/);
  assert.doesNotMatch(migration, /response_content/);
  assert.doesNotMatch(migration, /prompt_content/);
});

test('equipment specialist is derived from an observed tool trace', () => {
  assert.match(migration, /read_equipment_intelligence/);
  assert.match(migration, /v_specialist := 'equipment'/);
  assert.match(migration, /read_executive_%/);
});

test('evaluation scenarios cover roadmap canonical questions without pretending semantic grading', () => {
  assert.match(evaluation, /blocked_work_orders/);
  assert.match(evaluation, /attention_today/);
  assert.match(evaluation, /parts_for_work_orders/);
  assert.match(evaluation, /equipment_status/);
  assert.match(evaluation, /geology_review/);
  assert.match(evaluation, /semanticAccuracy: 'requires_grounded_review'/);
  assert.match(evaluation, /hallucinationAssessment: 'requires_grounded_review'/);
  assert.match(evaluation, /neverTreatTelemetryAsAnswerCorrectness: true/);
});

test('observability endpoint remains tenant and user scoped and read-only while exposing grounded metadata', () => {
  assert.match(route, /resolveExecutiveAccess/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('user_id', context\.userId\)/);
  assert.match(route, /evaluation_detail/);
  assert.match(route, /evaluator_version/);
  assert.match(route, /evaluated_at/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /structural_observability_plus_grounded_guard/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
});
