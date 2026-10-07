import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const actions = await readFile(new URL('../components/actions/actions-inbox.tsx', import.meta.url), 'utf8');
const controlCenter = await readFile(new URL('../app/api/maintenance/control-center/route.ts', import.meta.url), 'utf8');
const maintenanceHome = await readFile(new URL('../components/dashboard/maintenance-home.tsx', import.meta.url), 'utf8');
const decisionStrip = await readFile(new URL('../components/maintenance/autopilot-decision-strip.tsx', import.meta.url), 'utf8');
const dictionaries = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');

test('maintenance review tasks expose human operational copy instead of backend reason codes', () => {
  assert.match(inbox, /maintenanceReviewCopy/);
  assert.match(inbox, /Mantenimiento: equipo fuera de servicio/);
  assert.match(inbox, /Mantenimiento: equipo con observaciones/);
  assert.match(inbox, /asset_name/);
  assert.match(inbox, /machine_observations/);
});

test('actions inbox never prints raw task domain as user-facing metadata', () => {
  assert.doesNotMatch(actions, /\{task\.domain\} · \{task\.cargo_name\}/);
  assert.match(actions, /t\.families\[familyKey\(task\)\]/);
});

test('maintenance planning copy prefers human asset names and translated review reasons', () => {
  assert.match(controlCenter, /reviewReasonLabel/);
  assert.match(controlCenter, /const equipment = row\.asset_name \|\| 'Equipo'/);
  assert.doesNotMatch(controlCenter, /row\.machine_observations \|\| row\.review_reason/);
});

test('planning decisions stay above the long canonical reference overview', () => {
  const queueIndex = maintenanceHome.indexOf('<Card className="shadow-none">');
  const overviewIndex = maintenanceHome.indexOf('<CanonicalMaintenanceOverview />');
  assert.ok(queueIndex >= 0);
  assert.ok(overviewIndex > queueIndex);
});

test('Spanish maintenance naming and assisted-decision labels are consistent', () => {
  assert.match(dictionaries, /title: 'Mi Mantenimiento'/);
  assert.match(decisionStrip, /MOTIL · decisiones asistidas/);
});
