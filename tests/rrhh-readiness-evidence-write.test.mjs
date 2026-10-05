import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/rrhh/people/evidence/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/rrhh/personas/[id]/page.tsx', import.meta.url), 'utf8');

test('RRHH evidence write endpoint is organization scoped and role guarded', () => {
  assert.match(route, /allowedRoles = new Set\(\['superadmin', 'admin', 'manager'\]\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /eq\('id', personId\)/);
  assert.match(route, /source_type: 'motil_rrhh_manual'/);
  assert.match(route, /source_reference: 'user:' \+ context\.userId/);
});

test('RRHH evidence capture writes only to canonical readiness sources', () => {
  for (const table of ['people_employment_assignments', 'person_credentials', 'person_competencies', 'person_epp_assignments']) {
    assert.match(route, new RegExp("\\.from\\('" + table + "'\\)"));
  }
  assert.doesNotMatch(route, /policyConfigured:\s*true/);
});

test('Person 360 exposes controlled evidence capture and recalculates from server state', () => {
  assert.match(page, /Completar habilitación/);
  assert.match(page, /\/api\/rrhh\/people\/evidence/);
  assert.match(page, /setReloadKey\(\(value\) => value \+ 1\)/);
  assert.match(page, /no declara APTO mientras la política de la faena no esté configurada/);
});
