import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const source = await readFile(new URL('../components/maintenance/work-orders-queue.tsx', import.meta.url), 'utf8');
test('OT list precedes optional indicators', () => {
  assert.ok(source.indexOf('<Card className="overflow-hidden shadow-none">') < source.indexOf('data-testid="ot-more-indicators"'));
  assert.match(source, /data-testid="ot-more-filters"/);
  assert.match(source, /Ver más · Buscar y filtrar/);
});
test('approval and completed views remain distinct; historical is not operational', () => {
  assert.match(source, /viewFilter === 'approval'/);
  assert.match(source, /viewFilter === 'historical'/);
  assert.match(source, /record_scope !== 'historical'/);
  assert.match(source, /approval_status/);
});
