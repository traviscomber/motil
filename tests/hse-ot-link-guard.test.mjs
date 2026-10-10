import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/20261010210000_link_hse_corrective_actions_to_maintenance_ot.sql', import.meta.url), 'utf8');
const api = readFileSync(new URL('../app/api/sostenibilidad/corrective-actions/work-orders/route.ts', import.meta.url), 'utf8');

test('link schema prevents duplicates and organization crossing', () => {
  assert.match(sql, /unique \(corrective_action_id, work_order_id\)/);
  assert.match(sql, /nc_org is distinct from wo_org/);
  assert.match(sql, /nc_org is distinct from new.organization_id/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all .* from anon, authenticated/);
});
test('link API enforces HSE write and maintenance read plus organization checks', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS.HSE_RIESGOS, write\)/);
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS.MANT_OPERACIONES\)/);
  assert.match(api, /\.eq\('organization_id', context.organizationId\)/);
  assert.match(api, /ignoreDuplicates: true/);
  assert.doesNotMatch(api, /\.update\('status'/);
});
