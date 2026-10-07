import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const canonical = await readFile(new URL('../lib/maintenance/ariel-canonical.ts', import.meta.url), 'utf8');
const overview = await readFile(new URL('../components/maintenance/canonical-maintenance-overview.tsx', import.meta.url), 'utf8');

test('maintenance overview keeps warehouse outside the maintenance team and includes Joaquin', () => {
  const teamBlock = canonical.split('export const ARIEL_MAINTENANCE_TEAM')[1].split('] as const;')[0];
  assert.match(teamBlock, /Joaquín Martínez/);
  assert.match(teamBlock, /Jefe de Taller Mina Don Jaime/);
  assert.doesNotMatch(teamBlock, /Esteban Díaz/);
});

test('maintenance coordination flow includes Joaquin under mobile and stationary equipment leadership', () => {
  const flowBlock = canonical.split('export const ARIEL_MAINTENANCE_FLOW')[1].split('] as const;')[0];
  assert.match(flowBlock, /Mauricio Astudillo/);
  assert.match(flowBlock, /Joaquín Martínez/);
  assert.match(flowBlock, /Mina Don Jaime/);
  assert.doesNotMatch(flowBlock, /Esteban Díaz/);
});

test('overview renders from canonical team and flow arrays', () => {
  assert.match(overview, /ARIEL_MAINTENANCE_TEAM/);
  assert.match(overview, /ARIEL_MAINTENANCE_FLOW/);
});
