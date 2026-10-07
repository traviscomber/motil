import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queue = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../app/api/maintenance/work-orders/route.ts', import.meta.url), 'utf8');
const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
const detailApi = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');

test('maintenance work orders render as an inbox-style clickable list', () => {
  assert.match(queue, /href=\{\`\/dashboard\/mantenimiento\/ordenes-trabajo\/\$\{order\.id\}\`\}/);
  assert.match(queue, /Estado<\/span>/);
  assert.match(queue, /Orden<\/span>/);
  assert.match(queue, /Equipo<\/span>/);
  assert.match(queue, /Responsable<\/span>/);
  assert.match(queue, /t\.inboxViews\.active/);
  assert.match(queue, /t\.inboxViews\.approval/);
  assert.match(queue, /t\.inboxViews\.completed/);
  assert.match(queue, /t\.approval\.review/);
  assert.match(queue, /t\.approval\.record/);
  assert.match(queue, /Continuar/);
});

test('completed work orders keep approval state and an auditable log', () => {
  assert.match(api, /work_order_supervisor_reviews/);
  assert.match(api, /approval_status/);
  assert.match(queue, /reviewed_by_name/);
  assert.match(detail, /Historial de la OT/);
  assert.match(detail, /EntityTimeline entity="work_order"/);
});

test('explicit DEMO and UAT work orders stay out of operational UI', () => {
  assert.match(api, /isExplicitDemoRecord/);
  assert.match(api, /\(demo\|uat\)/);
  assert.match(api, /filter\(\(row\) => !isExplicitDemoRecord\(row\)\)/);
  assert.match(detailApi, /isExplicitDemoRecord/);
  assert.match(detailApi, /!data \|\| isExplicitDemoRecord\(data\)/);
});

test('maintenance agenda stays secondary to the inbox', () => {
  assert.match(queue, /<details className="rounded-lg border bg-card">/);
  assert.match(queue, /t\.schedule\.title/);
  assert.doesNotMatch(queue, /onMarkComplete=\{markScheduleComplete\}/);
});
