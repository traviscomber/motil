import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827234500_integrate_standard_plan_steps_into_close_readiness_v2.sql','utf8');
const api = fs.readFileSync('app/api/maintenance/work-order-close-queue/route.ts','utf8');
const queue = fs.readFileSync('components/maintenance/progressive-work-order-close-queue.tsx','utf8');
const detail = fs.readFileSync('components/maintenance/work-order-detail.tsx','utf8');
const dictionaries = fs.readFileSync('lib/i18n/dictionaries.ts','utf8');

test('close readiness v2 includes pending standard plan steps', () => {
  assert.match(migration, /work_order_standard_plan_execution_v1/);
  assert.match(migration, /standard_plan_steps_pending/);
  assert.match(migration, /complete_standard_plan_step/);
  assert.match(migration, /security_invoker=true/);
  assert.match(migration, /revoke all on public\.work_order_close_readiness_v2 from public,anon,authenticated/i);
});

test('close queue API reads v2 and exposes plan progress', () => {
  assert.match(api, /from\('work_order_close_readiness_v2'\)/);
  assert.match(api, /pendingPlanSteps/);
  assert.match(api, /workOrdersWithPendingPlan/);
  assert.match(api, /complete_standard_plan_step/);
});

test('progressive close executes the first pending plan step inline', () => {
  assert.match(queue, /next_plan_step_id/);
  assert.match(dictionaries, /markStepDone: 'Marcar paso realizado'/);
  assert.match(queue, /standard-plan/);
  assert.match(queue, /stepObservation/);
  assert.match(queue, /fill\(t\.planBadgeTemplate, \{ completed: current\.standard_plan_steps_completed \|\| 0, total: current\.standard_plan_steps_total \|\| 0 \}\)/);
});

test('work order detail has one closure path', () => {
  assert.match(detail, /ordenes-trabajo\/cierre\?workOrderId=/);
  assert.match(detail, /t\.actions\.continueClose/);
  assert.match(dictionaries, /continueClose: 'Continuar cierre'/);
  assert.doesNotMatch(detail, /Confirmar cierre/);
  assert.doesNotMatch(detail, /completeOrder/);
});
