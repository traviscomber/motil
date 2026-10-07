import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeRoute = await readFile(
  new URL('../app/api/maintenance/work-order-runtime-evidence/route.ts', import.meta.url),
  'utf8',
);
const standardPlanRoute = await readFile(
  new URL('../app/api/maintenance/work-orders/[id]/standard-plan/route.ts', import.meta.url),
  'utf8',
);

test('runtime evidence keeps RPC primary and falls back only after legacy permission rejection', () => {
  assert.match(runtimeRoute, /record_work_order_runtime_evidence_v1/);
  assert.match(runtimeRoute, /includes\('sin permisos'\)/);
  assert.match(runtimeRoute, /asset_runtime_readings/);
  assert.match(runtimeRoute, /work_order_runtime_evidence/);
  assert.match(runtimeRoute, /authorization_path: 'assigned_executor_fallback'/);
});

test('standard plan keeps RPC primary and falls back only for an already authorized executor', () => {
  assert.match(standardPlanRoute, /requireAssignedMaintenanceExecution/);
  assert.match(standardPlanRoute, /complete_work_order_standard_plan_step_v1/);
  assert.match(standardPlanRoute, /includes\('sin permisos'\)/);
  assert.match(standardPlanRoute, /work_order_standard_plan_step_executions/);
  assert.match(standardPlanRoute, /authorization_path: 'assigned_executor_fallback'/);
});
