import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827225500_require_runtime_evidence_before_corrective_close_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/maintenance/work-order-runtime-evidence/route.ts', 'utf8');
const queueApi = fs.readFileSync('app/api/maintenance/work-order-close-queue/route.ts', 'utf8');
const ui = fs.readFileSync('components/maintenance/progressive-work-order-close-queue.tsx', 'utf8');
const dictionaries = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');

test('corrective OT closure requires resolved runtime evidence', () => {
  assert.match(migration, /lower\(coalesce\(v_wo\.work_type,''\)\)='correctivo'/i);
  assert.match(migration, /Registra el horómetro o documenta por qué no está disponible antes de cerrar/i);
  assert.match(migration, /record_runtime_evidence/i);
});

test('runtime evidence preserves meter reading or explicit unavailability', () => {
  assert.match(migration, /evidence_status in \('meter_reading','not_available'\)/i);
  assert.match(migration, /source_reference.*work_order_close:/is);
  assert.match(migration, /unavailable_reason/i);
  assert.match(migration, /runtime_evidence_recorded/i);
});

test('runtime evidence RPC and table stay backend only', () => {
  assert.match(migration, /revoke all privileges on table public\.work_order_runtime_evidence from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.record_work_order_runtime_evidence_v1.*public, anon, authenticated/is);
  assert.match(migration, /grant execute on function public\.record_work_order_runtime_evidence_v1.*postgres, service_role/is);
});

test('runtime evidence endpoint is maintenance authorized and tenant checked', () => {
  assert.match(api, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /record_work_order_runtime_evidence_v1/);
  assert.match(api, /mode === 'meter_reading'/);
  assert.match(api, /unavailableReason/);
});

test('progressive close queue exposes horometer as one explicit next action', () => {
  assert.match(queueApi, /record_runtime_evidence:\s*\d+/);
  assert.match(queueApi, /missingRuntimeEvidence/);
  assert.match(ui, /not_available/);
  assert.match(ui, /work-order-runtime-evidence/);
  assert.match(dictionaries, /recordRuntimeEvidence: 'Resolver horómetro'/);
  assert.match(dictionaries, /registerReading: 'Registrar lectura'/);
  assert.match(dictionaries, /closeFreeze: 'Cerrar OT y congelar costo'/);
});
