import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');

test('role inbox enriches maintenance reviews from the canonical drilling review queue', () => {
  assert.match(source, /\.from\('drilling_maintenance_review_queue_v1'\)/);
  assert.match(source, /\.select\('review_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.in\('review_id', maintenanceReviewIds\)/);
});

test('maintenance review enrichment uses operational Spanish labels and asset identity', () => {
  assert.match(source, /Revisar equipo fuera de servicio/);
  assert.match(source, /Revisar observación mecánica/);
  assert.match(source, /Revisar equipo operativo con observaciones/);
  assert.match(source, /asset_code/);
  assert.match(source, /asset_name/);
  assert.match(source, /Reporte \$\{sourceDateLabel\(evidence\.operation_date\)\}/);
});

test('maintenance review enrichment fails open to the canonical task inbox', () => {
  assert.match(source, /maintenance review enrichment failed/);
  assert.match(source, /if \(!evidence\) return task/);
  assert.match(source, /evidenceParts\.join\(' · '\) \|\| task\.evidence_summary/);
});


test('role inbox preserves escalation over support for the same task', () => {
  assert.match(source, /owner: 0,[\s\S]*escalation: 1,[\s\S]*support: 2/);
  assert.match(source, /nextRank < currentRank/);
});
