import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/assets/[id]/operational-360/route.ts', 'utf8');
const sourcesLib = fs.readFileSync('lib/maintenance/asset-360-data-sources.ts', 'utf8');
const workspace = fs.readFileSync('components/maintenance/asset-related-operations.tsx', 'utf8');

test('asset 360 uses latest audited closure snapshot per work order', () => {
  assert.match(sourcesLib, /work_order_closure_cost_snapshots/);
  assert.match(api, /closure_sequence/);
  assert.match(api, /latestSnapshots/);
  assert.doesNotMatch(api, /work_order_cost_summary/);
});

test('asset 360 separates installed and pending parts without inventing stock', () => {
  assert.match(api, /work_order_parts/);
  assert.match(api, /installedParts/);
  assert.match(api, /pendingParts/);
  assert.match(api, /no se infiere stock disponible/i);
});

test('asset operational workspace surfaces work, history, audited costs, parts and documents', () => {
  assert.match(workspace, /Próximos trabajos/);
  assert.match(workspace, /Historial operacional/);
  assert.match(workspace, /Costo por intervención auditada/);
  assert.match(workspace, /Repuestos/);
  assert.match(workspace, /Documentación del equipo/);
  assert.match(workspace, /api\/documents\/list\?module=mantenimiento&category=equipos&assetId=/);
});
