import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260914121500_add_decision_human_action_history.sql', import.meta.url), 'utf8');
const endpoint = await readFile(new URL('../app/api/intelligence/decision-cases/human-action/route.ts', import.meta.url), 'utf8');
const timeline = await readFile(new URL('../lib/intelligence/decision-case-timeline.ts', import.meta.url), 'utf8');
const timelineRoute = await readFile(new URL('../app/api/intelligence/decision-cases/timeline/route.ts', import.meta.url), 'utf8');

test('human decision action is atomic with lifecycle transition and evidence snapshot', () => {
  assert.match(migration, /apply_motil_decision_human_action/);
  assert.match(migration, /for update/);
  assert.match(migration, /update public\.motil_ai_decision_cases/);
  assert.match(migration, /insert into public\.motil_ai_decision_human_actions/);
  assert.match(migration, /recommendation_snapshot/);
  assert.match(migration, /evidence_refs_snapshot/);
  assert.match(migration, /missing_evidence_snapshot/);
  assert.match(migration, /contradictions_snapshot/);
});

test('human decision history remains backend only and tenant/user bounded', () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.motil_ai_decision_human_actions from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.motil_ai_decision_human_actions to service_role/);
  assert.match(migration, /organization_id = p_organization_id/);
  assert.match(migration, /created_by_user_id = p_user_id/);
  assert.match(endpoint, /filterAccessibleDecisionCaseDomains/);
  assert.match(endpoint, /p_organization_id: context\.organizationId/);
  assert.match(endpoint, /p_user_id: context\.userId/);
});

test('human action endpoint changes only advisory case lifecycle and keeps operational truth untouched', () => {
  assert.match(endpoint, /apply_motil_decision_human_action/);
  assert.match(endpoint, /operationalMutationExecuted: false/);
  assert.match(endpoint, /no ejecuta la recomendación operacional/);
  assert.doesNotMatch(endpoint, /maintenance_work_orders|canonical_inventory_current|canonical_purchase_orders_current/);
});

test('decision timeline prefers explicit v2 actions and labels legacy gaps honestly', () => {
  assert.match(timeline, /human_action_log/);
  assert.match(timeline, /Registro legacy sin comentario\/snapshot v2/);
  assert.match(timeline, /Registro legacy sin actor\/comentario\/snapshot v2 verificable/);
  assert.match(timeline, /comment: action\.comment/);
  assert.match(timeline, /recommendationSnapshot: action\.recommendation_snapshot/);
  assert.match(timelineRoute, /motil_ai_decision_human_actions/);
  assert.match(timelineRoute, /humanActionCount/);
});
