import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const source = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');
test('general OT summary and history are expandable', () => {
  assert.match(source, /data-testid="ot-detail-more-summary"/);
  assert.match(source, /data-testid="ot-detail-history"/);
  assert.match(source, /Ver más · Historial de la OT/);
});
test('operational work and approval controls remain outside secondary panels', () => {
  const general = source.slice(source.indexOf('  return <div className="space-y-6">'));
  assert.ok(general.indexOf('<WorkOrderExecutionReadiness') > general.indexOf('ot-detail-more-summary'));
  assert.ok(general.indexOf('<WorkOrderEvidenceAndApproval') < general.indexOf('ot-detail-history'));
  assert.match(source, /if \(isExecution\)/);
  assert.match(source, /mode === 'planning'/);
  assert.match(source, /mode === 'leadership'/);
});
