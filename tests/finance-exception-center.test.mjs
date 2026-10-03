import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261002235000_refine_finance_alerts_and_exception_details.sql', import.meta.url),
  'utf8',
);
const completeWorklistMigration = await readFile(
  new URL('../supabase/migrations/20261003002000_complete_finance_exception_worklist.sql', import.meta.url),
  'utf8',
);
const sourceShapeMigration = await readFile(
  new URL('../supabase/migrations/20261003003000_separate_finance_zero_from_source_shape.sql', import.meta.url),
  'utf8',
);
const api = await readFile(new URL('../app/api/finanzas/excepciones/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/finanzas/excepciones/page.tsx', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/dashboard/finanzas/layout.tsx', import.meta.url), 'utf8');
const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');

test('finance alerts separate valid financial exceptions from source warnings', () => {
  assert.match(migration, /validation_status = 'valid'[\s\S]*coalesce\(net_amount, 0::numeric\) = 0::numeric/);
  assert.match(migration, /validation_status = 'valid'[\s\S]*cost_center_code/);
  assert.match(migration, /source_warning_lines/);
  assert.match(migration, /coalesce\(validation_status, ''\) <> 'valid'/);
  assert.match(migration, /Validación financiera no acreditada/);
});

test('finance exception detail view preserves source lineage and is service-role only', () => {
  assert.match(migration, /finance_purchase_line_exceptions_v1/);
  assert.match(migration, /source_file/);
  assert.match(migration, /source_sheet/);
  assert.match(migration, /source_row/);
  assert.match(migration, /revoke select[\s\S]*from anon, authenticated/i);
  assert.match(migration, /grant select[\s\S]*to service_role/i);
});

test('finance exception API enforces module access and keeps validation server-side', () => {
  assert.match(api, /MODULE_KEYS\.FIN_FINANZAS/);
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.FIN_FINANZAS, true\)/);
  assert.match(api, /run_canonical_financial_validation/);
  assert.match(api, /finance_purchase_line_exceptions_v1/);
  assert.match(api, /financial_validation_results/);
});

test('finance exception workspace is read-only for canonical rows and exposes validation', () => {
  assert.match(page, /Excepciones financieras/);
  assert.match(page, /Esta vista no corrige ni sobrescribe filas/);
  assert.match(page, /Ejecutar validación/);
  assert.match(page, /source_file/);
  assert.match(page, /source_sheet/);
  assert.match(page, /source_row/);
  assert.doesNotMatch(page, /method: 'PATCH'/);
});

test('finance navigation and role-task routes land on actionable control surfaces', () => {
  assert.match(layout, /\/dashboard\/finanzas\/excepciones/);
  assert.match(inbox, /missing_cost_centers/);
  assert.match(inbox, /zero_amount_lines/);
  assert.match(inbox, /source_warning_lines/);
  assert.match(inbox, /\/dashboard\/finanzas\/excepciones\?issue=/);
  assert.match(inbox, /treasury_missing_due_date[\s\S]*\/dashboard\/finanzas\/pagos/);
});


test('finance exception center stays quality-scoped and includes future unlinked-product rows', () => {
  assert.match(api, /QUALITY_ALERT_CODES/);
  assert.match(api, /\.in\('alert_code', QUALITY_ALERT_CODES\)/);
  assert.match(api, /unlinked_products/);
  assert.match(completeWorklistMigration, /'unlinked_products'::text as exception_kind/);
  assert.match(completeWorklistMigration, /canonical\.products/);
});


test('finance quality keeps explicit zero amounts separate from malformed source shape', () => {
  assert.match(sourceShapeMigration, /validation_status = 'valid'[\s\S]*net_amount = 0::numeric/);
  assert.match(sourceShapeMigration, /validation_status = 'valid' and net_amount is null/);
  assert.match(sourceShapeMigration, /source_warning_lines/);
  assert.match(sourceShapeMigration, /missing_centers[\s\S]*net_amount is not null/);
});
